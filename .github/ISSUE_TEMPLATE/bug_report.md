name: Bug report
description: Create a report to help us improve
title: \"[Bug]: <short description>\"
labels: [\"bug\"]
body:
  - type: textarea
    id: what-happened
    attributes:
      label: What happened?
      description: Describe the bug in detail.
      placeholder: A clear and concise description...
  - type: textarea
    id: steps
    attributes:
      label: Steps to reproduce
      value: |
        1. Go to '...'
        2. Click on '....'
        3. See error
  - type: dropdown
    id: area
    attributes:
      label: Affected area
      options:
        - Front-end
        - Back-end
        - DevOps / CI
        - Docs
