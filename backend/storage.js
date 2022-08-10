/**
 * "Fake" little in-memory (i.e., not persistent) document store with pub/sub..
 *
 * A real implementation could be swapped in underneath to use
 * dynamodb/mongodb/elastic/etc with redis distributed pubsub as backend? Or
 * maybe even a graph database if we reduced events in the backend?
 *
 * Abstraction means swapping in fakes for testing is simpler but more important
 * that we can swap in different backends. For this demos sake we're sticking
 * with in-memory though...
 */
module.exports = function createStorageBackend() {
  const events = [];
  const subscribers = new Set();
  return {
    addEvent,
    subscribe,
    unsubscribe,
  };

  function addEvent({ eventType, data }) {
    const event = {
      eventType,
      data,
      // We start event ids at 1 as 0 is falsey in JS and can easily cause issues
      eventId: events.length + 1,
      eventDateCreated: new Date().toISOString(),
    };
    events.push(event);
    subscribers.forEach((subscriber) => subscriber([event]));
  }

  function subscribe(subscriber) {
    subscriber(events);
    subscribers.add(subscriber);
  }

  function unsubscribe(subscriber) {
    subscribers.delete(subscriber);
  }
};
