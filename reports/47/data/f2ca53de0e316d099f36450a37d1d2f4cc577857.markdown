# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: layers/ui/authentication/Auth.general-user.setup.ts >> Authenticate General User
- Location: tests/layers/ui/authentication/Auth.general-user.setup.ts:3:1

# Error details

```
Test timeout of 130000ms exceeded.
```

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Dashboard' })
Expected: visible
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 90000ms
  - waiting for getByRole('heading', { name: 'Dashboard' })
    - waiting for" https://opensource-demo.orangehrmlive.com/web/index.php/auth/validate" navigation to finish...
    - navigated to "https://opensource-demo.orangehrmlive.com/web/index.php/dashboard/index"

```

# Test source

```ts
  92  |     elementName: string,
  93  |   ): Promise<string[]> {
  94  |     return this.performAction(
  95  |       async () => {
  96  |         return elements.allTextContents();
  97  |       },
  98  |       callerMethodName,
  99  |       `Retrieved all text contents from ${elementName}`,
  100 |       `Failed to get all text contents from ${elementName}`,
  101 |     );
  102 |   }
  103 | 
  104 |   /**
  105 |    * Checks if an element is visible.
  106 |    * @param element The Locator of the element to check.
  107 |    * @param callerMethodName The name of the method that called the action.
  108 |    * @param elementName The name of the element.
  109 |    * @returns A promise that resolves with true if the element is visible, or false otherwise.
  110 |    */
  111 |   public async isElementVisible(
  112 |     element: Locator,
  113 |     callerMethodName: string,
  114 |     elementName: string,
  115 |   ): Promise<boolean> {
  116 |     return this.performAction(
  117 |       () => element.isVisible(),
  118 |       callerMethodName,
  119 |       `Verified: ${elementName} is visible`,
  120 |       `Failed to check visibility of ${elementName}`,
  121 |     );
  122 |   }
  123 | 
  124 |   /**
  125 |    * Retrieves the count of matching elements.
  126 |    * @param element The Locator of elements to retrieve the count from.
  127 |    * @param callerMethodName The name of the method that called the action.
  128 |    * @param elementName The name of the elements.
  129 |    * @returns A promise that resolves with the count of matching elements.
  130 |    */
  131 |   public async getElementCount(
  132 |     element: Locator,
  133 |     callerMethodName: string,
  134 |     elementName: string,
  135 |   ): Promise<number> {
  136 |     return this.performAction(
  137 |       () => element.count(),
  138 |       callerMethodName,
  139 |       `Retrieved count for ${elementName}`,
  140 |       `Failed to get count for ${elementName}`,
  141 |     );
  142 |   }
  143 | 
  144 |   /**
  145 |    * Retrieves the bounding box of an element.
  146 |    * @param element The Locator of the element to retrieve the bounding box from.
  147 |    * @param callerMethodName The name of the method that called the action.
  148 |    * @param elementName The name of the element.
  149 |    * @returns A promise that resolves with the bounding box of the element if it succeeds, or null if it fails.
  150 |    * The bounding box is represented as an object with the following properties:
  151 |    * - x: The x-coordinate of the top-left corner of the bounding box.
  152 |    * - y: The y-coordinate of the top-left corner of the bounding box.
  153 |    * - width: The width of the bounding box.
  154 |    * - height: The height of the bounding box.
  155 |    */
  156 |   public async getBoundingBox(
  157 |     element: Locator,
  158 |     callerMethodName: string,
  159 |     elementName: string,
  160 |   ): Promise<{ x: number; y: number; width: number; height: number } | null> {
  161 |     return this.performAction(
  162 |       () => element.boundingBox(),
  163 |       callerMethodName,
  164 |       `Retrieved bounding box for ${elementName}`,
  165 |       `Failed to get bounding box for ${elementName}`,
  166 |     );
  167 |   }
  168 | 
  169 |   /**
  170 |    * Verifies that an element is in a specified state.
  171 |    * @param element The Locator of the element to verify the state of.
  172 |    * @param callerMethodName The name of the method that called the action.
  173 |    * @param state The desired state of the element: "enabled", "disabled", "visible", or "hidden".
  174 |    * @param elementName The name of the element.
  175 |    */
  176 |   public async verifyElementState(
  177 |     element: Locator,
  178 |     callerMethodName: string,
  179 |     state: AssertionElementState,
  180 |     elementName: string,
  181 |   ): Promise<void> {
  182 |     await this.performAction(
  183 |       async () => {
  184 |         switch (state) {
  185 |           case "enabled":
  186 |             await expect(element).toBeEnabled();
  187 |             break;
  188 |           case "disabled":
  189 |             await expect(element).toBeDisabled();
  190 |             break;
  191 |           case "visible":
> 192 |             await expect(element).toBeVisible();
      |                                   ^ Error: expect(locator).toBeVisible() failed
  193 |             break;
  194 |           case "hidden":
  195 |             await expect(element).not.toBeVisible();
  196 |             break;
  197 |         }
  198 |       },
  199 |       callerMethodName,
  200 |       `${elementName} state is ${state}`,
  201 |       `Failed to verify element ${elementName} is ${state}`,
  202 |     );
  203 |   }
  204 | 
  205 |   /**
  206 |    * Waits for an element to be in a specified state.
  207 |    * @param element The Locator of the element to wait for.
  208 |    * @param callerMethodName The name of the method that called the action.
  209 |    * @param state The desired state of the element: "attached", "detached", "enabled", "disabled", "visible", or "hidden".
  210 |    * @param elementName The name of the element.
  211 |    * @param options Optional: timeout for the waitForElementState action.
  212 |    * @returns A promise that resolves if the verification succeeds, or rejects with an error if it fails.
  213 |    */
  214 |   public async waitForElementState(
  215 |     element: Locator,
  216 |     callerMethodName: string,
  217 |     state: WaitForElementState,
  218 |     elementName: string,
  219 |     options?: { timeout?: number },
  220 |   ): Promise<void> {
  221 |     await this.performAction(
  222 |       async () => {
  223 |         await element.waitFor({
  224 |           state,
  225 |           ...(options?.timeout !== undefined && { timeout: options.timeout }),
  226 |         });
  227 |       },
  228 |       callerMethodName,
  229 |       `${elementName} is ${state}`,
  230 |       `Failed waiting for element ${elementName} to be ${state}`,
  231 |     );
  232 |   }
  233 | 
  234 |   /**
  235 |    * Checks if an element reaches a specified state within the timeout period.
  236 |    * @param element The Locator of the element to wait for.
  237 |    * @param callerMethodName The name of the method that called the action.
  238 |    * @param state The desired state of the element: "attached", "detached", "enabled", "disabled", "visible", or "hidden".
  239 |    * @param elementName The name of the element.
  240 |    * @param options Optional: timeout for the waitForElementState action.
  241 |    * @returns A promise that resolves with true if the verification succeeds, or false if it fails.
  242 |    */
  243 |   public async isElementStateReached(
  244 |     element: Locator,
  245 |     callerMethodName: string,
  246 |     state: WaitForElementState,
  247 |     elementName: string,
  248 |     options?: { timeout?: number },
  249 |   ): Promise<boolean> {
  250 |     try {
  251 |       await this.performAction(
  252 |         async () => {
  253 |           await element.waitFor({
  254 |             state,
  255 |             ...(options?.timeout !== undefined && { timeout: options.timeout }),
  256 |           });
  257 |         },
  258 |         callerMethodName,
  259 |         `${elementName} is ${state}`,
  260 |         `Failed waiting for element ${elementName} to be ${state}`,
  261 |       );
  262 | 
  263 |       return true;
  264 |     } catch (error) {
  265 |       ErrorHandler.captureError(
  266 |         error,
  267 |         callerMethodName,
  268 |         `waitForElementState failed for ${elementName}`,
  269 |       );
  270 |       return false;
  271 |     }
  272 |   }
  273 | 
  274 |   /**
  275 |    * Checks if an element is editable.
  276 |    * @param element The Locator of the element to check.
  277 |    * @param callerMethodName The name of the method that called the action.
  278 |    * @param elementName The name of the element.
  279 |    * @returns A promise that resolves with true if the element is editable, or false otherwise.
  280 |    */
  281 |   public async isElementEditable(
  282 |     element: Locator,
  283 |     callerMethodName: string,
  284 |     elementName: string,
  285 |   ): Promise<boolean> {
  286 |     return this.performAction(
  287 |       () => element.isEditable(),
  288 |       callerMethodName,
  289 |       `${elementName} is editable`,
  290 |       `Failed to check if ${elementName} is editable`,
  291 |     );
  292 |   }
```