name: Feature request
description: Suggest an idea for this project
title: "[Feature]: "
labels: ["enhancement", "needs-triage"]
assignees: []
body:
  - type: markdown
    attributes:
      value: |
        Thanks for taking the time to suggest a new feature! ✨
        
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
        - label: This is not a bug report (use the bug template instead)
          required: true
          
  - type: textarea
    id: summary
    attributes:
      label: Feature Summary
      description: A brief description of the feature you'd like to see
      placeholder: One sentence summary of the feature
    validations:
      required: true
      
  - type: textarea
    id: problem
    attributes:
      label: Problem Statement
      description: What problem are you trying to solve? What's the use case?
      placeholder: As a [user type], I want [functionality] so that [benefit/value]
    validations:
      required: true
      
  - type: textarea
    id: solution
    attributes:
      label: Proposed Solution
      description: Describe your preferred solution in detail
      placeholder: Describe how you envision this feature working
    validations:
      required: true
      
  - type: textarea
    id: alternatives
    attributes:
      label: Alternative Solutions
      description: What other approaches have you considered?
      placeholder: Describe any alternative solutions or features you've considered
      
  - type: dropdown
    id: area
    attributes:
      label: Affected Area
      description: Which part of the application would this feature affect?
      options:
        - Frontend - User Interface
        - Backend - API/Business Logic
        - Database - Data Models
        - Authentication - User Management
        - Payments - Billing/Transactions
        - DevOps - Infrastructure
        - Documentation
        - Other
    validations:
      required: true
      
  - type: dropdown
    id: priority
    attributes:
      label: Priority
      description: How important is this feature to you?
      options:
        - Low - Nice to have
        - Medium - Would improve user experience
        - High - Important for core functionality
        - Critical - Required for MVP/launch
    validations:
      required: true
      
  - type: dropdown
    id: complexity
    attributes:
      label: Estimated Complexity
      description: How complex do you think this feature would be to implement?
      options:
        - Simple - Small change, minimal impact
        - Medium - Moderate effort, some integration needed
        - Complex - Significant effort, multiple components affected
        - Major - Large feature, architectural changes needed
        - Unknown - Not sure about complexity
        
  - type: textarea
    id: acceptance
    attributes:
      label: Acceptance Criteria
      description: Definition of done - how do we know this feature is complete?
      placeholder: |
        - [ ] Criterion 1
        - [ ] Criterion 2
        - [ ] Criterion 3
    validations:
      required: true
      
  - type: textarea
    id: mockups
    attributes:
      label: Mockups/Screenshots
      description: If applicable, add mockups or screenshots to help explain the feature
      
  - type: textarea
    id: additional
    attributes:
      label: Additional Context
      description: Add any other context, links, or references about the feature here
