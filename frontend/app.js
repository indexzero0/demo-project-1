"use strict";

/**
 * **********************************************************************
 * Boundary around react components
 *
 * In a non-demo/prod world I'd put these in separate modules/files and do
 * prereading of react standards and best practices (as I haven't used ReactJS
 * in prod before) but for the sake of a simple demo and being concious of my
 * time, I'm keeping them together in one file
 * **********************************************************************
 */

/**
 * "Smart" component that manages its own state and sends comments/likes to
 * server
 *
 * Maybe in non-demo world this would be better as a "Dumb" component and
 * we leave the top level app/discussion component to manage state...?
 * Needs some thought at least...
 */
class CommentForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = { value: "", isAddingComment: false };

    this.storage = storage();
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleChange(event) {
    this.setState({ value: event.target.value });
  }

  handleSubmit(event) {
    // We don't want to actually submit the form (i.e., refresh the page)
    event.preventDefault();

    if (this.state.value) {
      this.setState({ isAddingComment: true });
      this.storage
        .addEvent({
          eventType: "addComment",
          data: {
            from: this.props.from,
            body: this.state.value,
            parentCommentId: this.props.parentCommentId || null,
          },
        })
        .then(() => this.setState({ value: "" }))
        .finally(() => this.setState({ isAddingComment: false }));
    }
  }

  render() {
    // We don't want to double submit so disable if waiting for add to finish
    return (
      <form onSubmit={this.handleSubmit}>
        <fieldset disabled={this.state.isAddingComment}>
          <input
            type="text"
            placeholder={this.props.placeholder}
            className="body"
            value={this.state.value}
            onChange={this.handleChange}
          />
          <input className="post" type="submit" value={this.props.buttonText} />
        </fieldset>
      </form>
    );
  }
}

// "Dumb" component for representing upvote/like button
class UpvoteButton extends React.Component {
  render() {
    return (
      <input
        className="upvote"
        type="button"
        value={`${this.props.isUpvotedByCurrentUser ? "▼ Undo" : "▲ Upvote"} (${
          this.props.upvoteCount
        })`}
        onClick={() =>
          this.props.isUpvotedByCurrentUser
            ? this.props.handleRemoveUpvote()
            : this.props.handleAddUpvote()
        }
      />
    );
  }
}

// "Dumb" component representing a reply button (component may be overkill here...)
class ReplyButton extends React.Component {
  render() {
    return (
      <input
        className="reply"
        type="button"
        value="Reply"
        onClick={() => this.props.handleToggle()}
      />
    );
  }
}

// "Dumb" component for representing rendered comments in a discussion
class Comment extends React.Component {
  render() {
    return (
      <div className="comment">
        <div className="title">
          <img className="thumbnail" src={this.props.from.thumbnail} />
          <span className="from">{this.props.from.name}</span>
          <span className="created">{getTimeFromNow(this.props.created)}</span>
        </div>
        <div className="body">{this.props.body}</div>
        <div className="toolbar">{this.props.toolbar}</div>
        {this.props.children}
      </div>
    );
  }
}

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      comments: [],
      currentUser: {},
      // List of comments ids that are displaying a reply input box
      showReplyInput: [],
    };

    generateRandomUser().then((currentUser) => {
      this.setState(() => ({
        currentUser,
      }));
    });

    /**
     * Using a basic state architecture that reduces a stream of events into comments
     * and then renders them into dom elements. Maybe a framework like redux (never
     * used it personally) would be better in prod but again maybe its also
     * overkill. Maybe even better to reduce on the server side...?
     */
    this.storage = storage();
    this.storage.subscribe((events) =>
      this.setState((prevState) => ({
        comments: events.reduce(reduceEvents, [...prevState.comments]),
      }))
    );
  }

  handleAddUpvote(commentId) {
    this.storage.addEvent({
      eventType: "addCommentUpvote",
      data: { fromUsername: this.state.currentUser.username, commentId },
    });
  }

  handleRemoveUpvote(commentId) {
    this.storage.addEvent({
      eventType: "removeCommentUpvote",
      data: { fromUsername: this.state.currentUser.username, commentId },
    });
  }

  handleToggleReply(commentId) {
    this.setState((prevState) => {
      const newState = prevState.showReplyInput.includes(commentId)
        ? prevState.showReplyInput.filter(
            (stateCommentId) => stateCommentId !== commentId
          )
        : [...prevState.showReplyInput, commentId];

      return {
        showReplyInput: newState,
      };
    });
  }

  render() {
    const comments = this.state.comments
      .filter((comment) => !comment.parentCommentId)
      .reduce((accumComments, comment) => {
        const showReplyBox = this.state.showReplyInput.includes(
          comment.eventId
        );

        /**
         * In a non-demo/prod world I'd use a more appropriate data structure (e.g.,
         * a graph) to avoid quadratic time complexity, which will only get worse in
         * supporting larger depths. But for demos sake just going the brute force
         * approach (note: brute force approach may be fine depending on context)
         */
        const replies = this.state.comments
          .filter(
            (stateComment) => stateComment.parentCommentId === comment.eventId
          )
          .reduce((accumReplies, reply) => {
            const paddingLeft = 50;
            return [
              <div key={reply.eventId} style={{ paddingLeft }}>
                <Comment
                  body={reply.body}
                  from={reply.from}
                  created={reply.eventDateCreated}
                  upvotes={reply.upvotes}
                  toolbar={
                    <span>
                      <UpvoteButton
                        isUpvotedByCurrentUser={reply.upvotes.has(
                          this.state.currentUser.username
                        )}
                        upvoteCount={reply.upvotes.size}
                        handleAddUpvote={() =>
                          this.handleAddUpvote(reply.eventId)
                        }
                        handleRemoveUpvote={() =>
                          this.handleRemoveUpvote(reply.eventId)
                        }
                      />
                    </span>
                  }
                ></Comment>
              </div>,
              ...accumReplies,
            ];
          }, []);

        return [
          <Comment
            key={comment.eventId}
            body={comment.body}
            from={comment.from}
            created={comment.eventDateCreated}
            upvotes={comment.upvotes}
            toolbar={
              <span>
                <UpvoteButton
                  isUpvotedByCurrentUser={comment.upvotes.has(
                    this.state.currentUser.username
                  )}
                  upvoteCount={comment.upvotes.size}
                  handleAddUpvote={() => this.handleAddUpvote(comment.eventId)}
                  handleRemoveUpvote={() =>
                    this.handleRemoveUpvote(comment.eventId)
                  }
                />
                <input
                  className="reply"
                  type="button"
                  value={showReplyBox ? "Cancel" : "Reply "}
                  onClick={() => this.handleToggleReply(comment.eventId)}
                />
              </span>
            }
          >
            {showReplyBox ? (
              <CommentForm
                from={this.state.currentUser}
                parentCommentId={comment.eventId}
                placeholder="How will you reply?"
                buttonText="Reply"
              />
            ) : null}
            {replies}
          </Comment>,
          ...accumComments,
        ];
      }, []);

    return (
      <div>
        <div className="primary">
          <img className="thumbnail" src={this.state.currentUser.thumbnail} />
          <CommentForm
            from={this.state.currentUser}
            placeholder="What are your thoughts?"
            buttonText="Comment"
          />
        </div>
        {comments}
      </div>
    );
  }
}

ReactDOM.createRoot(document.getElementById("discussion")).render(<App />);

/**
 * **********************************************************************
 * Boundary between methods that in a non-demo case may be extracted into
 * individual testable modules/files.
 * **********************************************************************
 */

async function generateRandomUser() {
  return fetch("/whoami", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  }).then((response) => response.json());
}

/**
 * Server side backend storage (in non-demo world I would've kept the
 * local in-memory implementation somewhere as a fake for unit testing)
 */
function storage() {
  return { addEvent, subscribe };

  function subscribe(subscription) {
    const remoteSubscription = new EventSource("/subscribe");
    remoteSubscription.onmessage = (event) => {
      subscription(JSON.parse(event.data));
    };
  }

  function addEvent({ eventType, data }) {
    return fetch("/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType,
        data,
      }),
    })
      .then((response) => response.json())
      .catch((error) =>
        console.error(
          `Failed to post ${eventType} event with data `,
          data,
          ` due to ${error}`
        )
      );
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

  function addComment({
    eventId,
    eventDateCreated,
    data: { from, body, parentCommentId },
  }) {
    accumComments.push({
      eventId,
      eventDateCreated,
      from,
      body,
      parentCommentId,
      upvotes: new Set(),
    });
  }

  function addCommentUpvote({ data: { fromUsername, commentId } }) {
    accumComments
      .filter((comment) => comment.eventId === commentId)
      .forEach((comment) => {
        comment.upvotes.add(fromUsername);
      });
  }

  function removeCommentUpvote({ data: { fromUsername, commentId } }) {
    accumComments
      .filter((comment) => comment.eventId === commentId)
      .forEach((comment) => {
        comment.upvotes.delete(fromUsername);
      });
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
