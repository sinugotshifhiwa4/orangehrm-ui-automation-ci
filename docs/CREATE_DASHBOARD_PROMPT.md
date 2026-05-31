# PROMPT

> Build a **professional test analytics dashboard** using **pure HTML, CSS, and vanilla JavaScript (no frameworks)**.
>
> The dashboard must fetch data from:
> [https://pub-1a2929fbcaf44458951bbb84b49b5f3f.r2.dev/orangehrm-automation/test-results-history.json](https://pub-1a2929fbcaf44458951bbb84b49b5f3f.r2.dev/orangehrm-automation/test-results-history.json)
>
> ---
>
> ## 🎯 Goal
>
> Create a centralized reporting dashboard for Playwright automation results that looks similar in quality to Allure Report and ReportPortal.
>
> ---
>
> ## 📊 Data Structure
>
> The JSON structure is:
>
> - byBranch
>   - byTestType (authenticate, regression, etc.)
>     - runs (array of executions)
>
> Each run contains:
>
> - runNumber, date, branch, env
> - passed, failed, skipped, flaky, total
> - passRate
> - durationMs / durationMin
> - reportUrl, allureUrl
>
> ---
>
> ## 🧱 Requirements
>
> ### 1. Data Handling
>
> - Fetch JSON from the URL
> - Flatten data into a single array of runs
> - Add derived fields:
>   - status (PASS/FAIL)
>   - formatted date
>
> ---
>
> ### 2. Dashboard Sections
>
> #### 🔹 Summary Cards
>
> - Total runs
> - Avg pass rate
> - Total failures
> - Avg duration
>
> #### 🔹 Filters (top bar)
>
> - Branch selector (dropdown)
> - Environment selector
> - Test type selector (authenticate, regression, etc.)
>
> #### 🔹 Trend Charts (Chart.js)
>
> - Pass rate over time
> - Duration over time
> - Failures over time
>
> #### 🔹 Breakdown Views
>
> - By Test Type (bar chart)
> - By Branch (bar chart)
> - By Environment
>
> #### 🔹 Runs Table
>
> Columns:
>
> - Run #
> - Date
> - Branch
> - Test Type
> - Env
> - Pass rate
> - Duration
> - Status
> - Links:
>   - "Report"
>   - "Allure"
>
> ---
>
> ### 3. UI / UX (VERY IMPORTANT)
>
> - Dark theme (similar to Allure)
> - Clean cards with shadows
> - Responsive layout
> - Color system:
>   - Green = pass
>   - Red = fail
>   - Yellow = flaky/skipped
>
> ---
>
> ### 4. Architecture & Code Structure (MANDATORY)
>
> Even though the output must be a single HTML file, the JavaScript must be logically modular and separated into clearly defined sections:
>
> #### 🔹 Data Module
>
> - Function to fetch data from the URL
> - Function to normalize/flatten nested structure:
>   - Convert `byBranch → byTestType → runs` into a flat array
> - Add derived fields (status, formattedDate)
>
> #### 🔹 State Management
>
> - Maintain a global state object:
>   - allRuns
>   - filteredRuns
>   - selected filters (branch, env, testType)
>
> #### 🔹 Filter Module
>
> - Functions to:
>   - Populate dropdowns dynamically
>   - Apply filters to dataset
>   - Trigger UI updates
>
> #### 🔹 Chart Module
>
> - Separate functions for each chart:
>   - renderPassRateTrend()
>   - renderDurationTrend()
>   - renderFailureTrend()
>   - renderBreakdowns()
>
> #### 🔹 Table Module
>
> - Function to render table
> - Support:
>   - Sorting
>   - Highlight failed runs
>
> #### 🔹 Utility Functions
>
> - Date formatting
> - Duration formatting
> - Aggregations (averages, totals)
>
> ---
>
> ### 5. Technical Constraints
>
> - Use:
>   - Chart.js (CDN)
> - No frameworks (no React/Vue)
> - Everything in ONE HTML file
> - Must run locally and on static hosting
>
> ---
>
> ### 6. Bonus Features (if possible)
>
> - Auto-refresh every 60 seconds
> - Sortable table
> - Highlight failed runs
>
> ---
>
> ## 🎨 Output format
>
> Return:
>
> - One complete HTML file
> - Clearly separated JS sections (with comments for each module)
> - Clean, professional CSS styling
>
> Do NOT simplify the UI — it must look like a real production dashboard.

---
