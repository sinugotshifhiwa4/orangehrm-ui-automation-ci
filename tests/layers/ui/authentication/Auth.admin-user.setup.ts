import { test as authentication } from "../../../../fixtures/test.fixture.js";

authentication(
  "Authenticate Admin User",
  {
    tag: ["@authenticate", "@sanity", "@regression"],
  },
  async ({ authenticationExecutor }) => {
    await authenticationExecutor.run("ADMIN");
  },
);
