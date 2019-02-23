import * as React from 'react';
import { render } from 'react-dom';
import { interpret } from 'xstate';

import { createEditorMachine } from './statechart';

type Content = string;

class Editor extends React.Component<
  {},
  { content: string; isEditable: boolean }
> {
  private machine = createEditorMachine<Content>({
    contentIsDirty: (previousContent, currentContent) =>
      previousContent !== currentContent,
    onActive: () => {
      console.log('active');
    },
    onContentDirty: content => {
      this.setState({
        content,
      });
    },
    onEditable: () => {
      this.setState({
        isEditable: true,
      });
    },
    onIdle: () => {
      console.log('idle');
    },
    onUneditable: () => {
      this.setState({
        isEditable: false,
      });
    },
    onResetEditor: () => {
      this.setState({
        content: '',
      });
    },
    TIME_BEFORE_IDLE: 500,
  });
  private interpreter = interpret(this.machine);

  constructor(props) {
    super(props);
    this.state = {
      content: '',
      isEditable: false,
    };
  }

  public componentDidMount() {
    this.interpreter.start();
  }

  render() {
    return (
      <>
        <form>
          <fieldset disabled={!this.state.isEditable}>
            <legend>Edit content</legend>
            <label>
              Headline
              <input
                type="text"
                onChange={event =>
                  this.interpreter.send({
                    type: 'CONTENT_UPDATED',
                    content: event.target.value,
                  })
                }
              />
            </label>
            <button>Save</button>
          </fieldset>
        </form>
        <p>{this.state.content}</p>
        <div>
          <form>
            <fieldset>
              <legend>Locks</legend>
              <button
                type="button"
                onClick={() =>
                  this.interpreter.send({
                    type: 'LOCAL_LOCK_RELEASED',
                  })
                }
              >
                Release local lock
              </button>
              <button
                type="button"
                onClick={() =>
                  this.interpreter.send({
                    type: 'FOREIGN_LOCK_ADDED',
                  })
                }
              >
                Add foreign lock
              </button>
              <button
                type="button"
                onClick={() =>
                  this.interpreter.send({
                    type: 'FOREIGN_LOCK_RELEASED',
                  })
                }
              >
                Release foreign lock
              </button>
            </fieldset>
          </form>
          <form>
            <fieldset>
              <legend>Access</legend>
              <button
                type="button"
                onClick={() =>
                  this.interpreter.send({
                    type: 'ACCESS_DENIED',
                  })
                }
              >
                Deny access
              </button>
              <button
                type="button"
                onClick={() =>
                  this.interpreter.send({
                    type: 'ACCESS_GRANTED',
                  })
                }
              >
                Grant access
              </button>
            </fieldset>
          </form>
        </div>
      </>
    );
  }
}

render(<Editor />, document.getElementById('root'));
