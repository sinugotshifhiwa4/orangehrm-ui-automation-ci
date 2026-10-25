# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: layers/ui/authentication/Auth.admin-user.setup.ts >> Authenticate Admin User
- Location: tests/layers/ui/authentication/Auth.admin-user.setup.ts:3:1

# Error details

```
Test timeout of 130000ms exceeded.
```

```
Error: page.goto: net::ERR_CONNECTION_TIMED_OUT at https://opensource-demo.orangehrmlive.com/web/index.php/auth/login
Call log:
  - navigating to "https://opensource-demo.orangehrmlive.com/web/index.php/auth/login", waiting until "load"

```

# Test source

```ts
  1   | import { type Page, type Response, expect } from "@playwright/test";
  2   | import { ActionBase } from "./actionBase.js";
  3   | 
  4   | export class NavigationActions extends ActionBase {
  5   |   /**
  6   |    * Creates navigation helpers for the active page.
  7   |    * @param page - Active Playwright page instance.
  8   |    */
  9   |   constructor(page: Page) {
  10  |     super(page);
  11  |   }
  12  | 
  13  |   /**
  14  |    * Navigates to a specified URL.
  15  |    * @param url The URL to navigate to.
  16  |    * @param callerMethodName The name of the method that called this function.
  17  |    * @param options Optional navigation options.
  18  |    * @returns A promise that resolves with the response or null.
  19  |    */
  20  |   public async navigateToUrl(
  21  |     url: string,
  22  |     callerMethodName: string,
  23  |     options?: {
  24  |       waitUntil?: "load" | "domcontentloaded" | "networkidle" | "commit";
  25  |       timeout?: number;
  26  |     },
  27  |   ): Promise<Response | null> {
  28  |     return this.performAction(
> 29  |       () => this.page.goto(url, options),
      |                       ^ Error: page.goto: net::ERR_CONNECTION_TIMED_OUT at https://opensource-demo.orangehrmlive.com/web/index.php/auth/login
  30  |       callerMethodName,
  31  |       `Navigated to ${url}`,
  32  |       `Failed to navigate to ${url}`,
  33  |     );
  34  |   }
  35  | 
  36  |   /**
  37  |    * Reloads the current page.
  38  |    * @param callerMethodName The name of the method that called this function.
  39  |    * @param options Optional reload options.
  40  |    * @returns A promise that resolves with the response or null.
  41  |    */
  42  |   public async reloadPage(
  43  |     callerMethodName: string,
  44  |     options?: {
  45  |       waitUntil?: "load" | "domcontentloaded" | "networkidle" | "commit";
  46  |       timeout?: number;
  47  |     },
  48  |   ): Promise<Response | null> {
  49  |     return this.performAction(
  50  |       () => this.page.reload(options),
  51  |       callerMethodName,
  52  |       "Page reloaded successfully",
  53  |       "Failed to reload page",
  54  |     );
  55  |   }
  56  | 
  57  |   /**
  58  |    * Navigates back in browser history.
  59  |    * @param callerMethodName The name of the method that called this function.
  60  |    * @param options Optional navigation options.
  61  |    * @returns A promise that resolves with the response or null.
  62  |    */
  63  |   public async goBack(
  64  |     callerMethodName: string,
  65  |     options?: {
  66  |       waitUntil?: "load" | "domcontentloaded" | "networkidle" | "commit";
  67  |       timeout?: number;
  68  |     },
  69  |   ): Promise<Response | null> {
  70  |     return this.performAction(
  71  |       () => this.page.goBack(options),
  72  |       callerMethodName,
  73  |       "Navigated back successfully",
  74  |       "Failed to navigate back",
  75  |     );
  76  |   }
  77  | 
  78  |   /**
  79  |    * Navigates forward in browser history.
  80  |    * @param callerMethodName The name of the method that called this function.
  81  |    * @param options Optional navigation options.
  82  |    * @returns A promise that resolves with the response or null.
  83  |    */
  84  |   public async goForward(
  85  |     callerMethodName: string,
  86  |     options?: {
  87  |       waitUntil?: "load" | "domcontentloaded" | "networkidle" | "commit";
  88  |       timeout?: number;
  89  |     },
  90  |   ): Promise<Response | null> {
  91  |     return this.performAction(
  92  |       () => this.page.goForward(options),
  93  |       callerMethodName,
  94  |       "Navigated forward successfully",
  95  |       "Failed to navigate forward",
  96  |     );
  97  |   }
  98  | 
  99  |   /**
  100 |    * Gets the current page URL.
  101 |    * @param callerMethodName The name of the method that called this function.
  102 |    * @returns The current URL as a string.
  103 |    */
  104 |   public async getCurrentUrl(callerMethodName: string): Promise<string> {
  105 |     return this.performAction(
  106 |       () => Promise.resolve(this.page.url()),
  107 |       callerMethodName,
  108 |       "Retrieved current URL",
  109 |       "Failed to get current URL",
  110 |     );
  111 |   }
  112 | 
  113 |   /**
  114 |    * Gets the current page title.
  115 |    * @param callerMethodName The name of the method that called this function.
  116 |    * @returns A promise that resolves with the page title.
  117 |    */
  118 |   public async getPageTitle(callerMethodName: string): Promise<string> {
  119 |     return this.performAction(
  120 |       () => this.page.title(),
  121 |       callerMethodName,
  122 |       "Retrieved page title",
  123 |       "Failed to get page title",
  124 |     );
  125 |   }
  126 | 
  127 |   /**
  128 |    * Verifies that the current page URL matches the expected URL.
  129 |    * @param expectedUrl The expected URL or pattern to verify against.
```