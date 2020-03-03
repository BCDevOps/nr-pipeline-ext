# Contributing

Contributions are welcome, but please review this document before making any change.

## Best Practices

* Be careful when using/passing/storing credentials.
* Code for Windows, MacOS, and Linux users.
* Use git shallow clone/fetch.
* Use Promises API. Avoid blocking/sync calls.
* Use logging framework. Avoid `console.log()` and `console.dir()`.
* Avoid unecessary dependencies to 3rd party modules.
* Follow our Linting rules
* Maintain quality

## Pull Requests

* We use the [Forking process](https://guides.github.com/activities/forking/) in our development. [Here](https://blog.scottlowe.org/2015/01/27/using-fork-branch-git-workflow/) are more details and best practices
* Please, add brief description of what's been added/fixed, what issue was addressed
* Also, add Jira ticket link if applicable
* Tag 2 developers (last one to touch code + one other)
* Reviewers either set the status to 'Approve' or 'Request Changes'
* Once approved, submitter Squash and Merge (not just Merge) code (kicks off Github Actions)
* Submitter ensures all Github Actions completes successfully

## Git Commit Messages styleguide

* Use the present tense ("Add feature" not "Added feature")
* Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
* Limit the first line to 72 characters or less
