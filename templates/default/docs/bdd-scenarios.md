# BDD Scenarios

This file indexes key business paths that should be represented in Gherkin `.feature` files as the product grows.

## Items CRUD

```gherkin
Feature: Manage items

  Scenario: Create and list an item
    Given the user is on the items page
    When the user creates an item named "First item"
    Then the item list includes "First item"

  Scenario: Update an item
    Given an item named "First item" exists
    When the user renames it to "Updated item"
    Then the item detail shows "Updated item"

  Scenario: Delete an item
    Given an item named "First item" exists
    When the user deletes it
    Then the item list no longer includes "First item"
```
