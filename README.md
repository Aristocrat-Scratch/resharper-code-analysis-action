# resharper-code-analysis-action
Jetbrain Resharper Code Analysis Github Action

Work in progress!


```yml
# This workflow uses actions that are not certified by GitHub.
# They are provided by a third-party and are governed by
# separate terms of service, privacy policy, and support
# documentation.
#
# Find more information at:
# https://github.com/xls/resharper-code-analysis-action

name: resharper C++ Code Analysis

on: [ push, pull_request ]

env:
  # Path to the solution directory.
  build: '${{ github.workspace }}'
  config: 'Debug'

jobs:
  analyze:
    name: Analyze
    runs-on: windows-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v2

      - name: Run Resharper Code Analysis
        uses: xls/resharper-code-analysis-action@main
        # Provide a unique ID to access the sarif output path
        id: run-analysis
        with:
          solution: ${{ env.build }}/sample.sln
          buildConfiguration: ${{ env.config }}

      # Upload SARIF file to GitHub Code Scanning Alerts
      - name: Upload SARIF to GitHub
        uses: github/codeql-action/upload-sarif@v1
        with:
          sarif_file: ${{ steps.run-analysis.outputs.sarif }}

      # Upload SARIF file as an Artifact to download and view
      - name: Upload SARIF as an Artifact
        uses: actions/upload-artifact@v2
        with:
          name: sarif-file
          path: ${{ steps.run-analysis.outputs.sarif }}
```
