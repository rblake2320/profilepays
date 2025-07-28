name: Bug report
description: Create a report to help us improve
title: "[Bug]: "
labels: ["bug", "needs-triage"]
assignees: []
body:
  - type: markdown
    attributes:
      value: |
        Thanks for taking the time to fill out this bug report! 🐛
        
  - type: checkboxes
    id: prerequisites
    attributes:
      label: Prerequisites
      description: Please confirm you have completed the following
      options:
        - label: I have searched existing issues to avoid creating duplicates
          required: true
        - label: I have read the contributing guidelines
          required: true
          
  - type: textarea
    id: what-happened
    attributes:
      label: Bug Description
      description: A clear and concise description of what the bug is
      placeholder: Describe what happened and what you expected to happen
    validations:
      required: true
      
  - type: textarea
    id: steps
    attributes:
      label: Steps to Reproduce
      description: Steps to reproduce the behavior
      value: |
        1. Go to '...'
        2. Click on '...'
        3. Scroll down to '...'
        4. See error
    validations:
      required: true
      
  - type: textarea
    id: expected
    attributes:
      label: Expected Behavior
      description: What you expected to happen
    validations:
      required: true
      
  - type: textarea
    id: actual
    attributes:
      label: Actual Behavior
      description: What actually happened instead
    validations:
      required: true
      
  - type: dropdown
    id: area
    attributes:
      label: Affected Area
      description: Which part of the application is affected?
      options:
        - Frontend
        - Backend
        - API
        - Database
        - Authentication
        - Payments
        - DevOps/CI
        - Documentation
        - Other
    validations:
      required: true
      
  - type: dropdown
    id: severity
    attributes:
      label: Severity
      description: How severe is this bug?
      options:
        - Low - Minor issue, workaround available
        - Medium - Affects functionality but not critical
        - High - Affects core functionality
        - Critical - Application unusable, data loss, or security issue
    validations:
      required: true
      
  - type: textarea
    id: environment
    attributes:
      label: Environment
      description: Please provide details about your environment
      value: |
        - OS: [e.g. Windows 10, macOS 12.0, Ubuntu 20.04]
        - Browser: [e.g. Chrome 96, Firefox 95, Safari 15]
        - Node.js Version: [e.g. 18.12.0]
        - Application Version: [e.g. 1.2.3]
      
  - type: textarea
    id: logs
    attributes:
      label: Error Logs
      description: Please copy and paste any relevant log output
      render: shell
      
  - type: textarea
    id: screenshots
    attributes:
      label: Screenshots
      description: If applicable, add screenshots to help explain your problem
      
  - type: textarea
    id: additional
    attributes:
      label: Additional Context
      description: Add any other context about the problem here
