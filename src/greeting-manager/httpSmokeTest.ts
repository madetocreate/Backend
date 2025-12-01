import { handleGreetingFeedHttp, handleNewsDetailHttp } from "./httpHandlers";

function createMockRes(label: string): any {
  const res: any = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: "",
    setHeader(name: string, value: string) {
      res.headers[name] = value;
    },
    end(chunk?: any) {
      if (chunk != null) {
        if (typeof chunk === "string") {
          res.body += chunk;
        } else {
          res.body += String(chunk);
        }
      }
      console.log("[" + label + "] status " + res.statusCode);
      console.log("[" + label + "] headers " + JSON.stringify(res.headers));
      console.log("[" + label + "] body " + res.body);
    }
  };
  return res;
}

async function run(): Promise<void> {
  const feedReq: any = {
    query: { userId: "demo-user" },
    headers: { "accept-language": "de-DE" }
  };
  const feedRes: any = createMockRes("feed");
  await handleGreetingFeedHttp(feedReq, feedRes);

  const detailReq: any = {
    query: { topic: "AI Regulation", userId: "demo-user" },
    headers: { "accept-language": "de-DE" }
  };
  const detailRes: any = createMockRes("detail");
  await handleNewsDetailHttp(detailReq, detailRes);
}

run().catch((err) => {
  console.error("httpSmokeTest error", err);
  process.exit(1);
});
