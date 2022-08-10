// More a demo of some tests, as oppose to complete coverage of all the things
const assert = require("assert");
const dateFaker = buildDateFaker();
describe("storage", function () {
  let storage;

  beforeEach(() => (storage = require("./storage")()));
  afterEach(() => dateFaker.reset());

  it("publishes events to subscribers", () => {
    dateFaker.set(new Date("2022-07-03T02:44:41.773Z"));

    const caughtEvents = [];
    storage.subscribe((events) => caughtEvents.push(...events));
    storage.addEvent({ eventType: "fakeEvent", data: { hello: "world" } });
    assert.deepEqual(caughtEvents, [
      {
        eventType: "fakeEvent",
        eventId: 0,
        eventDateCreated: "2022-07-03T02:44:41.773Z",
        data: { hello: "world" },
      },
    ]);
  });

  it("backfills new subscribers", () => {
    dateFaker.set(new Date("2022-07-03T02:44:41.773Z"));
    storage.addEvent({ eventType: "fakeEvent1", data: { hello: "world" } });
    storage.addEvent({ eventType: "fakeEvent2", data: { hello: "again" } });

    const caughtEvents = [];
    storage.subscribe((events) => caughtEvents.push(...events));
    assert.deepEqual(caughtEvents, [
      {
        eventType: "fakeEvent1",
        eventId: 0,
        eventDateCreated: "2022-07-03T02:44:41.773Z",
        data: { hello: "world" },
      },
      {
        eventType: "fakeEvent2",
        eventId: 1,
        eventDateCreated: "2022-07-03T02:44:41.773Z",
        data: { hello: "again" },
      },
    ]);
  });

  it("can be unsubscribed", () => {
    const caughtEvents = [];
    const subscription = (events) => caughtEvents.push(...events);
    storage.subscribe(subscription);
    storage.unsubscribe(subscription);

    storage.addEvent({ eventType: "fakeEvent", data: { hello: "world" } });
    assert.deepEqual(caughtEvents, []);
  });
});

/**
 * I'm assuming in a non-demo/prod world there's a library that does this for
 * us and should be used here but for now a hacky fake will do..
 */
function buildDateFaker() {
  const ogDate = Date;
  return {
    set,
    reset,
  };
  function set(dateObj) {
    Date = function () {
      return dateObj;
    };
  }
  function reset() {
    Date = ogDate;
  }
}
