const express = require("express");
const path = require("path");
const storage = require("./storage")();

const HTTP_PORT = process.env.PORT || 8080;
const HTTP_OK = 200;

const app = express();
app.use(express.static(path.join(__dirname, "../frontend")));
app.use(express.json());

/**
 * Uses server sent events because it looked interesting/fun but in a non-demo
 * world it may not meet browser compatibility requirements (see
 * https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events).
 * Maybe web sockets or polling would be more appropriate?
 */
app.get("/subscribe", (request, response, _next) => {
  const headers = {
    "Content-Type": "text/event-stream",
    Connection: "keep-alive",
    "Cache-Control": "no-cache",
  };
  response.writeHead(HTTP_OK, headers);

  storage.subscribe(handleEvent);
  request.on("close", () => storage.unsubscribe(handleEvent));

  function handleEvent(events) {
    response.write(`data: ${JSON.stringify(events)}\n\n`);
  }
});

app.post("/event", (request, response) => {
  const { eventType, data } = request.body;
  storage.addEvent({ eventType, data });
  response.send("{}");
});

app.listen(HTTP_PORT, () => {
  console.log(`Running server at http://localhost:${HTTP_PORT}`);
});
