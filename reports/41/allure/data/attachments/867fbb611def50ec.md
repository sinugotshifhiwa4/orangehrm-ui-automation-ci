# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: layers/ui/menuItems/Dashboard.spec.ts >> Dashboard Test Suite >> should load dashboard as the default page after successful login
- Location: tests/layers/ui/menuItems/Dashboard.spec.ts:9:3

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /dashboard\/index/
Received string:  "https://opensource-demo.orangehrmlive.com/web/index.php/auth/login"
Timeout: 90000ms

Call log:
  - Expect "toHaveURL" with timeout 90000ms
    93 × unexpected value "https://opensource-demo.orangehrmlive.com/web/index.php/auth/login"

```

# Page snapshot

```yaml
- generic [ref=e4]:
  - generic [ref=e6]:
    - img "company-branding" [ref=e8]
    - generic [ref=e9]:
      - heading "Login" [level=5] [ref=e10]
      - generic [ref=e11]:
        - generic [ref=e13]:
          - paragraph [ref=e14]: "Username : Admin"
          - paragraph [ref=e15]: "Password : admin123"
        - generic [ref=e16]:
          - generic [ref=e18]:
            - generic [ref=e19]:
              - generic [ref=e20]: 
              - generic [ref=e21]: Username
            - textbox "Username" [active] [ref=e23]
          - generic [ref=e25]:
            - generic [ref=e26]:
              - generic [ref=e27]: 
              - generic [ref=e28]: Password
            - textbox "Password" [ref=e30]
          - button "Login" [ref=e32] [cursor=pointer]
          - paragraph [ref=e34] [cursor=pointer]: Forgot your password?
      - generic [ref=e35]:
        - generic [ref=e36]:
          - link [ref=e37] [cursor=pointer]:
            - /url: https://www.linkedin.com/company/orangehrm/mycompany/
          - link [ref=e40] [cursor=pointer]:
            - /url: https://www.facebook.com/OrangeHRM/
          - link [ref=e43] [cursor=pointer]:
            - /url: https://twitter.com/orangehrm?lang=en
          - link [ref=e46] [cursor=pointer]:
            - /url: https://www.youtube.com/c/OrangeHRMInc
        - generic [ref=e49]:
          - paragraph [ref=e50]: OrangeHRM OS 5.8
          - paragraph [ref=e51]:
            - text: © 2005 - 2026
            - link "OrangeHRM, Inc" [ref=e52] [cursor=pointer]:
              - /url: http://www.orangehrm.com
            - text: . All rights reserved.
  - img "orangehrm-logo" [ref=e54]
```

# Test source

```ts
  1  | import { type Locator, type Page, expect } from "@playwright/test";
  2  | import { BasePage } from "../../base/basePage.js";
  3  | import type { DefaultPageOptions } from "./types/dashboard.type.js";
  4  | import logger from "../../../../configuration/system/logger/loggerManager.js";
  5  | 
  6  | export class DashboardPage extends BasePage {
  7  |   private readonly dashboardHeader: Locator;
  8  |   private readonly dashboardMenuItemLink: Locator;
  9  | 
  10 |   /**
  11 |    * Creates the dashboard page object and resolves the primary dashboard header locator.
  12 |    * @param page - Active Playwright page instance.
  13 |    */
  14 |   constructor(page: Page) {
  15 |     super(page);
  16 | 
  17 |     this.dashboardHeader = page.getByRole("heading", { name: "Dashboard" });
  18 |     this.dashboardMenuItemLink = page.locator(
  19 |       'a.oxd-main-menu-item[href$="/dashboard/index"]',
  20 |     );
  21 |   }
  22 | 
  23 |   /**
  24 |    * Verifies that the dashboard header is visible.
  25 |    * @returns A promise that resolves when the visibility check passes.
  26 |    */
  27 |   public async verifyDashboardHeaderIsVisible(): Promise<void> {
  28 |     await this.elementAssertions.verifyElementState(
  29 |       this.dashboardHeader,
  30 |       "verifyDashboardHeaderIsVisible",
  31 |       "visible",
  32 |       "Dashboard header",
  33 |     );
  34 |   }
  35 | 
  36 |   /**
  37 |    * Verifies that the dashboard is the default landing page by checking the URL
  38 |    * and confirming that the dashboard menu item is marked as active.
  39 |    * @param options - Options containing the expected dashboard URL and active class name.
  40 |    * @returns A promise that resolves when the dashboard default-page assertions pass.
  41 |    */
  42 |   public async verifyDashboardIsDefaultPage(
  43 |     options: DefaultPageOptions,
  44 |   ): Promise<void> {
  45 |     const { expectedUrl, classAttribute } = options;
  46 | 
> 47 |     await expect(this.page).toHaveURL(expectedUrl);
     |                             ^ Error: expect(page).toHaveURL(expected) failed
  48 | 
  49 |     const isDashboardActive = await this.element.hasClass(
  50 |       this.dashboardMenuItemLink,
  51 |       "verifyDashboardIsDefaultPage",
  52 |       classAttribute,
  53 |     );
  54 | 
  55 |     expect(isDashboardActive).toBe(true);
  56 | 
  57 |     logger.info(
  58 |       `Verified: Dashboard is the default page with URL: ${expectedUrl}`,
  59 |     );
  60 |   }
  61 | }
  62 | 
```