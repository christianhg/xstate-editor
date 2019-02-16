import * as React from 'react';
import { render } from 'react-dom';
import { State } from 'xstate';

import { createEditorMachine, EditorEvent, EditorContext } from './statechart';
import { createInterpreter, Interpreter } from './interpreter';

type Content = string;

class Editor extends React.Component<
  {},
  { content: string; isEditable: boolean }
> {
  private machine = createEditorMachine<Content>({
    contentIsDirty: (previousContent, currentContent) =>
      previousContent !== currentContent,
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
    onUneditable: () => {
      this.setState({
        isEditable: false,
      });
    },
    onResetEditor: () => {},
  });
  private interpreter: Interpreter<
    EditorContext<Content>,
    EditorEvent<Content>
  > = createInterpreter(
    this.machine,
    nextState => {
      this.editorState = nextState;
    },
    { debug: true },
  );
  private editorState: State<
    EditorContext<Content>,
    EditorEvent<Content>
  > = this.machine.initialState;

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
                  this.interpreter.send(this.editorState, {
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
                  this.interpreter.send(this.editorState, {
                    type: 'LOCAL_LOCK_RELEASED',
                  })
                }
              >
                Release local lock
              </button>
              <button
                type="button"
                onClick={() =>
                  this.interpreter.send(this.editorState, {
                    type: 'FOREIGN_LOCK_ADDED',
                  })
                }
              >
                Add foreign lock
              </button>
              <button
                type="button"
                onClick={() =>
                  this.interpreter.send(this.editorState, {
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
                  this.interpreter.send(this.editorState, {
                    type: 'ACCESS_DENIED',
                  })
                }
              >
                Deny access
              </button>
              <button
                type="button"
                onClick={() =>
                  this.interpreter.send(this.editorState, {
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
