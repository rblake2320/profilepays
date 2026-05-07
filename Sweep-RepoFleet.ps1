# Sweep-RepoFleet.ps1
[CmdletBinding()]
param(
    [Parameter(Mandatory=$false)][string[]]$Owners=@(),
    [Parameter(Mandatory=$false)][string[]]$Repos=@(),
    [switch]$IncludePrivate,
    [switch]$IncludeForks,
    [switch]$IncludeArchived,
    [string[]]$IncludePatterns=@("*"),
    [string[]]$ExcludePatterns=@(),
    [string[]]$LanguageAllowlist=@(),
    [string]$BranchPrefix="chore/health-sweep",
    [string[]]$Reviewers=@(),
    [string[]]$Labels=@("maintenance","automated","health-sweep"),
    [int]$MaxParallel=4,
    [switch]$DryRun,
    [switch]$SetupCI=$true,
    [switch]$SetupDependabot=$true,
    [switch]$SetupCodeQL=$true,
    [switch]$SetupPreCommit=$true,
    [switch]$UseDependabot=$true,
    [switch]$CleanOldBranches=$true,
    [switch]$CreatePR=$true,
    [switch]$Push=$true,
    [switch]$ConventionalCommits=$true,
    [switch]$SignCommits,
    [string]$ReportPath,
    [int]$TimeoutPerRepoMinutes=30,
    [switch]$AutoInstall
)

Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'

function Test-Command {
    param([string]$Name)
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Require-Command {
    param([string]$Name,[switch]$AutoInstall)
    if (-not (Test-Command $Name)) {
        if ($AutoInstall -and (Test-Command "winget")) {
            Write-Output "Installing $Name via winget..."
            winget install --id $Name --silent | Out-Null
        } else {
            throw "$Name not found in PATH."
        }
    }
}

function Init-Prereqs {
    Require-Command git $AutoInstall
    Require-Command gh $AutoInstall
}

function Get-Repositories {
    param(
        [string[]]$Owners,
        [string[]]$Repos,
        [switch]$IncludePrivate,
        [switch]$IncludeForks,
        [switch]$IncludeArchived
    )
    $result=@()
    if ($Repos.Count -gt 0) {
        $result += $Repos
    } else {
        foreach ($owner in $Owners) {
            $flags="--limit 1000"
            if ($IncludePrivate) { $flags += " --private" }
            if ($IncludeForks) { $flags += " --fork" }
            if ($IncludeArchived) { $flags += " --archived" }
            $json=gh repo list $owner $flags --json nameWithOwner | ConvertFrom-Json
            $result += $json.nameWithOwner
        }
    }
    return $result | Sort-Object -Unique
}

function Matches-Pattern {
    param([string]$Name,[string[]]$Include,[string[]]$Exclude)
    $ok=$false
    foreach($pat in $Include){ if($Name -like $pat){ $ok=$true; break } }
    foreach($pat in $Exclude){ if($Name -like $pat){ $ok=$false; break } }
    return $ok
}

function Detect-Languages {
    param([string]$Path)
    $langs=@()
    if (Test-Path (Join-Path $Path "package.json")) { $langs+="node" }
    if ((Test-Path (Join-Path $Path "pyproject.toml")) -or (Get-ChildItem -Path $Path -Filter "requirements*.txt" -Recurse -ErrorAction SilentlyContinue)) { $langs+="python" }
    if (Test-Path (Join-Path $Path "go.mod")) { $langs+="go" }
    if (Test-Path (Join-Path $Path "Cargo.toml")) { $langs+="rust" }
    if (Get-ChildItem -Path $Path -Filter "*.csproj" -Recurse -ErrorAction SilentlyContinue -First 1) { $langs+="dotnet" }
    if (Test-Path (Join-Path $Path "pom.xml") -or Test-Path (Join-Path $Path "build.gradle") -or Test-Path (Join-Path $Path "build.gradle.kts")) { $langs+="java" }
    if (Test-Path (Join-Path $Path "composer.json")) { $langs+="php" }
    if (Test-Path (Join-Path $Path "Gemfile")) { $langs+="ruby" }
    return $langs
}

function Run-Cmd {
    param(
        [string]$Cmd,
        [string]$WorkingDir,
        [int]$TimeoutMinutes
    )
    $psi=New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName="pwsh"
    $psi.Arguments="-NoProfile -Command $Cmd"
    $psi.RedirectStandardOutput=$true
    $psi.RedirectStandardError=$true
    $psi.UseShellExecute=$false
    $psi.WorkingDirectory=$WorkingDir
    $proc=[System.Diagnostics.Process]::Start($psi)
    if(-not $proc.WaitForExit($TimeoutMinutes*60*1000)){
        $proc.Kill()
        return [pscustomobject]@{Cmd=$Cmd;ExitCode=1;Output="Timeout"}
    }
    $out=$proc.StandardOutput.ReadToEnd() + $proc.StandardError.ReadToEnd()
    return [pscustomobject]@{Cmd=$Cmd;ExitCode=$proc.ExitCode;Output=$out}
}

function Run-NodeWorkflow {
    param([string]$RepoPath,[switch]$SkipTests)
    corepack enable | Out-Null
    if (Test-Path (Join-Path $RepoPath "pnpm-lock.yaml")) {
        Run-Cmd "pnpm i --frozen-lockfile" $RepoPath $TimeoutPerRepoMinutes | Out-Null
    } elseif (Test-Path (Join-Path $RepoPath "yarn.lock")) {
        Run-Cmd "yarn install --frozen-lockfile" $RepoPath $TimeoutPerRepoMinutes | Out-Null
    } else {
        Run-Cmd "npm ci" $RepoPath $TimeoutPerRepoMinutes | Out-Null
    }
    if (Test-Path (Join-Path $RepoPath ".prettierrc*")) {
        Run-Cmd "npx prettier -w ." $RepoPath $TimeoutPerRepoMinutes | Out-Null
    }
    $lintResult=Run-Cmd "npm run lint" $RepoPath $TimeoutPerRepoMinutes
    if ($SkipTests) { return $lintResult }
    $testResult=Run-Cmd "npm test" $RepoPath $TimeoutPerRepoMinutes
    return $lintResult,$testResult
}

function Run-PythonWorkflow {
    param([string]$RepoPath,[switch]$SkipTests)
    $venv=Join-Path $RepoPath ".venv"
    Run-Cmd "python -m venv .venv" $RepoPath $TimeoutPerRepoMinutes | Out-Null
    $pip="$venv/Scripts/pip"
    Run-Cmd "$pip install -U pip" $RepoPath $TimeoutPerRepoMinutes | Out-Null
    if (Test-Path (Join-Path $RepoPath "pyproject.toml")) {
        Run-Cmd "$pip install -e .[dev]" $RepoPath $TimeoutPerRepoMinutes | Out-Null
    } elseif (Get-ChildItem -Path $RepoPath -Filter "requirements*.txt" -ErrorAction SilentlyContinue) {
        Get-ChildItem -Path $RepoPath -Filter "requirements*.txt" | ForEach-Object { Run-Cmd "$pip install -r $_" $RepoPath $TimeoutPerRepoMinutes | Out-Null }
    }
    Run-Cmd "$venv/Scripts/black ." $RepoPath $TimeoutPerRepoMinutes | Out-Null
    $lint=Run-Cmd "$venv/Scripts/ruff check ." $RepoPath $TimeoutPerRepoMinutes
    if ($SkipTests) { return $lint }
    $test=Run-Cmd "$venv/Scripts/pytest -q" $RepoPath $TimeoutPerRepoMinutes
    $type=Run-Cmd "$venv/Scripts/mypy --strict ." $RepoPath $TimeoutPerRepoMinutes
    return $lint,$test,$type
}

function Run-GoWorkflow {
    param([string]$RepoPath,[switch]$SkipTests)
    Run-Cmd "go mod tidy" $RepoPath $TimeoutPerRepoMinutes | Out-Null
    Run-Cmd "gofmt -s -w ." $RepoPath $TimeoutPerRepoMinutes | Out-Null
    $vet=Run-Cmd "go vet ./..." $RepoPath $TimeoutPerRepoMinutes
    if ($SkipTests) { return $vet }
    $test=Run-Cmd "go test ./..." $RepoPath $TimeoutPerRepoMinutes
    return $vet,$test
}

function Run-RustWorkflow {
    param([string]$RepoPath,[switch]$SkipTests)
    Run-Cmd "cargo fmt --all" $RepoPath $TimeoutPerRepoMinutes | Out-Null
    $clippy=Run-Cmd "cargo clippy -- -D warnings" $RepoPath $TimeoutPerRepoMinutes
    if ($SkipTests) { return $clippy }
    $test=Run-Cmd "cargo test" $RepoPath $TimeoutPerRepoMinutes
    return $clippy,$test
}

function Run-DotNetWorkflow {
    param([string]$RepoPath,[switch]$SkipTests)
    Run-Cmd "dotnet restore" $RepoPath $TimeoutPerRepoMinutes | Out-Null
    Run-Cmd "dotnet format" $RepoPath $TimeoutPerRepoMinutes | Out-Null
    Run-Cmd "dotnet build -c Release" $RepoPath $TimeoutPerRepoMinutes | Out-Null
    if ($SkipTests) { return }
    Run-Cmd "dotnet test -c Release" $RepoPath $TimeoutPerRepoMinutes | Out-Null
}

function Run-JavaWorkflow {
    param([string]$RepoPath,[switch]$SkipTests)
    if (Test-Path (Join-Path $RepoPath "pom.xml")) {
        Run-Cmd "mvn -B -DskipTests=$($SkipTests.IsPresent.ToString().ToLower()) verify" $RepoPath $TimeoutPerRepoMinutes | Out-Null
    } elseif (Test-Path (Join-Path $RepoPath "gradlew")) {
        Run-Cmd "./gradlew --no-daemon build" $RepoPath $TimeoutPerRepoMinutes | Out-Null
        if (-not $SkipTests) { Run-Cmd "./gradlew --no-daemon test" $RepoPath $TimeoutPerRepoMinutes | Out-Null }
    }
}

function Run-PHPWorkflow {
    param([string]$RepoPath,[switch]$SkipTests)
    Run-Cmd "composer install --no-interaction --prefer-dist" $RepoPath $TimeoutPerRepoMinutes | Out-Null
    if (-not $SkipTests -and (Get-Command composer -ErrorAction SilentlyContinue)) {
        Run-Cmd "composer test" $RepoPath $TimeoutPerRepoMinutes | Out-Null
    }
}

function Run-RubyWorkflow {
    param([string]$RepoPath,[switch]$SkipTests)
    Run-Cmd "bundle install" $RepoPath $TimeoutPerRepoMinutes | Out-Null
    Run-Cmd "rubocop" $RepoPath $TimeoutPerRepoMinutes | Out-Null
    if (-not $SkipTests) {
        if (Test-Path (Join-Path $RepoPath "Rakefile")) {
            Run-Cmd "bundle exec rake test" $RepoPath $TimeoutPerRepoMinutes | Out-Null
        } elseif (Test-Path (Join-Path $RepoPath "spec")) {
            Run-Cmd "bundle exec rspec" $RepoPath $TimeoutPerRepoMinutes | Out-Null
        }
    }
}

function Has-OnlyDocsChanges {
    param([string]$RepoPath)
    $changes=git -C $RepoPath diff --name-only
    if ($changes.Count -eq 0) { return $false }
    foreach($file in $changes){
        if ($file -notmatch '\.md$' -and $file -notmatch '\.rst$' -and $file -notmatch '^docs/') {
            return $false
        }
    }
    return $true
}

function Check-ForbiddenTerms {
    param([string]$RepoPath)
    $diff=git -C $RepoPath diff --cached
    $forbidden=Select-String -InputObject $diff -Pattern "TODO|FIXME|console\.log|print\(|Write-Host" -SimpleMatch
    if ($forbidden) { throw "Forbidden terms detected in commit." }
}

function Test-ConventionalCommitMsg {
    param([string]$Message)
    if ($Message -notmatch '^(feat|fix|chore|docs|style|refactor|perf|test|build|ci|revert|deps)(\([\w\-]+\))?: .+') {
        throw "Commit message not conventional."
    }
}

function Update-Changelog {
    param([string]$RepoPath)
    $log=git -C $RepoPath log --pretty=format:"* %s (%h) - %ad" --date=short
    Set-Content -Path (Join-Path $RepoPath "CHANGELOG.md") -Value "# Changelog`n`n$log`n"
    git -C $RepoPath add CHANGELOG.md
}

function Ensure-HygieneFiles {
    param([string]$RepoPath)
    if (-not (Test-Path (Join-Path $RepoPath ".editorconfig"))) {
        Set-Content (Join-Path $RepoPath ".editorconfig") @"
root = true

[*]
end_of_line = lf
charset = utf-8
insert_final_newline = true
"@
        git -C $RepoPath add .editorconfig
    }
    if (-not (Test-Path (Join-Path $RepoPath ".gitattributes"))) {
        Set-Content (Join-Path $RepoPath ".gitattributes") "* text=auto"
        git -C $RepoPath add .gitattributes
    }
    if (-not (Test-Path (Join-Path $RepoPath "LICENSE"))) {
        $license="MIT License

Copyright (c) $(Get-Date -Format yyyy)"

        Set-Content (Join-Path $RepoPath "LICENSE") $license
        git -C $RepoPath add LICENSE
    }
}

function Ensure-File {
    param(
        [string]$Path,
        [string]$Content
    )
    $dir=Split-Path $Path
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    if (-not (Test-Path $Path)) {
        Set-Content -Path $Path -Value $Content
    }
}

function Commit-Changes {
    param([string]$RepoPath,[string]$Message)
    git -C $RepoPath add -A
    if ((git -C $RepoPath diff --cached --name-only).Count -eq 0) { return }
    Check-ForbiddenTerms -RepoPath $RepoPath
    Test-ConventionalCommitMsg -Message $Message
    if ($SignCommits) { git -C $RepoPath config commit.gpgsign true }
    git -C $RepoPath commit -m $Message | Out-Null
}

function Process-Repo {
    param(
        [string]$RepoFullName
    )
    $localDir=Join-Path $env:TEMP ("sweep-"+$RepoFullName.Replace("/","_"))
    if(Test-Path $localDir){ Remove-Item -Recurse -Force $localDir }
    gh repo clone $RepoFullName $localDir | Out-Null
    $default=gh repo view $RepoFullName --json defaultBranchRef -q ".defaultBranchRef.name"
    git -C $localDir checkout $default | Out-Null
    $branch="$BranchPrefix-$(Get-Date -Format yyyyMMdd)"
    if (git -C $localDir branch --list $branch) { git -C $localDir branch -D $branch | Out-Null }
    git -C $localDir checkout -b $branch | Out-Null
    $langs=Detect-Languages -Path $localDir
    if ($LanguageAllowlist.Count -gt 0) { $langs = $langs | Where-Object { $LanguageAllowlist -contains $_ } }
    $skipDocs=Has-OnlyDocsChanges -RepoPath $localDir
    if ($SetupPreCommit) {
        Ensure-File (Join-Path $localDir ".pre-commit-config.yaml") @"
repos:
  - repo: https://github.com/pre-commit/mirrors-prettier
    rev: v3.2.5
    hooks:
      - id: prettier
        files: \.(js|jsx|ts|tsx|json|md)$
  - repo: https://github.com/psf/black
    rev: 24.8.0
    hooks:
      - id: black
"@
        git -C $localDir add .pre-commit-config.yaml
    }
    Ensure-HygieneFiles -RepoPath $localDir
    foreach ($lang in $langs) {
        switch($lang){
            'node'   { Run-NodeWorkflow -RepoPath $localDir -SkipTests:$skipDocs }
            'python' { Run-PythonWorkflow -RepoPath $localDir -SkipTests:$skipDocs }
            'go'     { Run-GoWorkflow -RepoPath $localDir -SkipTests:$skipDocs }
            'rust'   { Run-RustWorkflow -RepoPath $localDir -SkipTests:$skipDocs }
            'dotnet' { Run-DotNetWorkflow -RepoPath $localDir -SkipTests:$skipDocs }
            'java'   { Run-JavaWorkflow -RepoPath $localDir -SkipTests:$skipDocs }
            'php'    { Run-PHPWorkflow -RepoPath $localDir -SkipTests:$skipDocs }
            'ruby'   { Run-RubyWorkflow -RepoPath $localDir -SkipTests:$skipDocs }
        }
    }
    Commit-Changes -RepoPath $localDir -Message "chore(format): apply auto-formatters"
    if (-not $skipDocs) {
        Commit-Changes -RepoPath $localDir -Message "chore(lint): run linters"
    }
    if ($SetupCI -or $SetupDependabot -or $SetupCodeQL) {
        if ($SetupCI) {
            $ciPath=Join-Path $localDir ".github/workflows/ci.yml"
            if (-not (Test-Path (Split-Path $ciPath))) { New-Item -ItemType Directory -Force -Path (Split-Path $ciPath) | Out-Null }
            Set-Content $ciPath @"
name: CI
on:
  pull_request:
  push:
    branches: [$default]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo placeholder
"@
            git -C $localDir add .github/workflows/ci.yml
        }
        if ($SetupDependabot) {
            $depPath=Join-Path $localDir ".github/dependabot.yml"
            if (-not (Test-Path (Split-Path $depPath))) { New-Item -ItemType Directory -Force -Path (Split-Path $depPath) | Out-Null }
            Set-Content $depPath @"
version: 2
updates:
  - package-ecosystem: npm
    directory: "/"
    schedule:
      interval: weekly
"@
            git -C $localDir add .github/dependabot.yml
        }
        if ($SetupCodeQL) {
            $codeqlPath=Join-Path $localDir ".github/workflows/codeql.yml"
            if (-not (Test-Path (Split-Path $codeqlPath))) { New-Item -ItemType Directory -Force -Path (Split-Path $codeqlPath) | Out-Null }
            Set-Content $codeqlPath @"
name: CodeQL
on:
  push:
    branches: [$default]
  pull_request:
    branches: [$default]
jobs:
  analyze:
    uses: github/codeql-action/analyze@v3
"@
            git -C $localDir add .github/workflows/codeql.yml
        }
        Commit-Changes -RepoPath $localDir -Message "chore(ci): add/update CI"
    }
    Commit-Changes -RepoPath $localDir -Message "chore(docs): repository hygiene"
    Update-Changelog -RepoPath $localDir
    Commit-Changes -RepoPath $localDir -Message "chore(docs): update changelog"
    $report=@()
    $report+="## $RepoFullName"
    $report+="Branches: $default -> $branch"
    $reportPathLocal=Join-Path $ReportPath ($RepoFullName.Replace("/","_")+"_REPORT.md")
    $report -join "`n" | Set-Content $reportPathLocal
    Add-Content -Path (Join-Path $ReportPath "SWEEP-REPORT.md") -Value ("- "+$RepoFullName+"`n")
    if ($Push -and -not $DryRun) {
        git -C $localDir push -u origin $branch | Out-Null
    }
    if ($CreatePR -and -not $DryRun) {
        $prTitle="Repo health sweep $(Get-Date -Format yyyy-MM-dd)"
        $prBody="Automated sweep.`nSee REPORT.md for details."
        $labelArgs = $Labels | ForEach-Object { "-l `"$($_)`"" } | Out-String
        $reviewArgs = $Reviewers | ForEach-Object { "--reviewer `"$($_)`"" } | Out-String
        gh pr create -R $RepoFullName -B $default -H $branch -t $prTitle -b $prBody $labelArgs $reviewArgs | Out-Null
        gh pr comment -R $RepoFullName (gh pr view -R $RepoFullName --json number -q ".number") -F $reportPathLocal | Out-Null
    }
}

if (-not $ReportPath) { $ReportPath = Join-Path $PWD "repo-sweep" }
New-Item -ItemType Directory -Force -Path $ReportPath | Out-Null
Set-Content (Join-Path $ReportPath "SWEEP-REPORT.md") "# Sweep Report`n"

Init-Prereqs

$repos=Get-Repositories -Owners $Owners -Repos $Repos -IncludePrivate:$IncludePrivate -IncludeForks:$IncludeForks -IncludeArchived:$IncludeArchived
$repos = $repos | Where-Object { Matches-Pattern $_ $IncludePatterns $ExcludePatterns }

$repos | ForEach-Object -Parallel {
    param($r)
    & $using:Process-Repo -RepoFullName $r
} -ThrottleLimit $MaxParallel
