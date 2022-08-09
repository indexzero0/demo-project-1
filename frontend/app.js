"use strict";

const username = generateRandomUsername();
const remoteStorage = storage();

/**
 * Using a basic state architecture that reduces a stream of events into comments
 * and then renders them into dom elements. Maybe a framework like redux (never
 * used it personally) would be better in prod but again maybe its also
 * overkill. Maybe even better to reduce on the server side...?
 */
(() => {
  let currentComments = [];
  remoteStorage.subscribe((events) => {
    currentComments = events.reduce(reduceEvents, [...currentComments]);
    rerenderComments(currentComments);
  });
})();

document
  .getElementById("addComment")
  .addEventListener("submit", createAddCommentHandler());

/**
 * **********************************************************************
 * Boundary between methods that in a non-demo case may be extracted into
 * individual testable modules/files.
 * **********************************************************************
 */

function createAddCommentHandler() {
  let isAddingComment = false;
  return (event) => {
    // We don't want to actually submit the form (i.e., refresh the page)
    event.preventDefault();

    // We don't want to double submit so noop if waiting for add to finish
    if (isAddingComment) {
      return;
    }

    const bodyElem = document.getElementById("body");
    const bodyValue = bodyElem.value.trim();
    if (bodyValue) {
      isAddingComment = true;
      remoteStorage
        .addEvent({
          eventType: "addComment",
          data: { from: username, bodyValue },
        })
        .then(() => (bodyElem.value = ""))
        .finally(() => (isAddingComment = false));
    }
  };
}

function generateRandomUsername() {
  return `user-${Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)}`;
}

/**
 * Currently this is just a local in-memory implementation of a storage backend.
 * Something like this would be useful for testing but in this case just an
 * interim abstraction until the servers backend is implemented in a future commit
 */
function storage() {
  const events = [];
  const subscriptions = [];

  return { addEvent, subscribe };

  function subscribe(subscription) {
    subscription(events);
    subscriptions.push(subscription);
  }

  async function addEvent({ eventType, data }) {
    const event = {
      eventType,
      data,
      eventId: events.length,
      eventDateCreated: new Date().toISOString(),
    };
    events.push(event);
    subscriptions.forEach((subscription) => subscription([event]));
    return {};
  }
}

function reduceEvents(accumComments, event) {
  const eventTypeHandlers = {
    addComment,
    addCommentUpvote,
    removeCommentUpvote,
  };
  if (eventTypeHandlers[event.eventType]) {
    eventTypeHandlers[event.eventType](event);
  } else {
    console.error("No idea how to handle event: ", event);
  }
  return accumComments;

  function addComment({ eventId, eventDateCreated, data: { from, body } }) {
    accumComments.push({
      eventId,
      eventDateCreated,
      from,
      body,
      upvotes: new Set(),
    });
  }

  function addCommentUpvote({ data: { from, commentId } }) {
    accumComments
      .filter((comment) => comment.eventId === commentId)
      .forEach((comment) => {
        comment.upvotes.add(from);
      });
  }

  function removeCommentUpvote({ data: { from, commentId } }) {
    accumComments
      .filter((comment) => comment.eventId === commentId)
      .forEach((comment) => {
        comment.upvotes.delete(from);
      });
  }
}

function rerenderComments(comments) {
  for (let comment of comments) {
    let commentElem =
      document.getElementById(`comment-${comment.eventId}`) ||
      createCommentElement(comment);

    /**
     * New dom elements are only created for new comments so anything dynamic
     * after comment creation (e.g., upvotes and time ago) needs to be
     * dynamically updated on each render
     */
    commentElem.querySelector(".upvotes").value = `${
      comment.upvotes.has(username) ? "Undo" : "Upvote"
    } (${comment.upvotes.size})`;

    commentElem.querySelector(".created").textContent = `${getTimeFromNow(
      comment.eventDateCreated
    )}`;
  }

  function createCommentElement({ eventId, from, body, upvotes }) {
    const commentElem = document.createElement("div");
    commentElem.setAttribute("class", "comment");
    commentElem.setAttribute("id", `comment-${eventId}`);

    const titleElem = document.createElement("div");
    titleElem.setAttribute("class", "title");
    commentElem.appendChild(titleElem);

    const fromElem = document.createElement("span");
    fromElem.setAttribute("class", "from");
    fromElem.textContent = from;
    titleElem.appendChild(fromElem);

    const createdElem = document.createElement("span");
    createdElem.setAttribute("class", "created");
    titleElem.appendChild(createdElem);

    const bodyElem = document.createElement("div");
    bodyElem.setAttribute("class", "body");
    bodyElem.textContent = body;
    commentElem.appendChild(bodyElem);

    const upvoteButton = document.createElement("input");
    upvoteButton.setAttribute("type", "button");
    upvoteButton.setAttribute("class", "upvotes");
    upvoteButton.addEventListener("click", () => {
      remoteStorage.addEvent({
        eventType: upvotes.has(username)
          ? "removeCommentUpvote"
          : "addCommentUpvote",
        data: { from: username, commentId: eventId },
      });
    });
    commentElem.appendChild(upvoteButton);

    document.getElementById("comments").prepend(commentElem);
    return commentElem;
  }
}

function getTimeFromNow(dateString) {
  /**
   * For a non-demo/prod application it's probably better to use a common well
   * tested library (like DayJS). It'll be more feature complete and should handle
   * more interesting error scenarios (e.g., when time goes backwards). For
   * demo purposes this is going to be kept thin, using seconds granularity and
   * assuming time only goes forward.
   */
  const MILLIS_IN_SECONDS = 1000;
  return `${Math.abs(
    (new Date().getTime() - new Date(dateString).getTime()) / MILLIS_IN_SECONDS
  )} seconds ago`;
}
