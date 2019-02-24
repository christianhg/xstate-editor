import { Machine, StateSchema, assign } from 'xstate';

export interface EditorStateSchema extends StateSchema {
  states: {
    editable: {
      states: {
        pristine: {
          states: {
            active: {};
            idle: {};
          };
        };
        dirty: {
          states: {
            active: {};
            idle: {};
          };
        };
      };
    };
    uneditable: {
      states: {
        lock: {
          states: {
            unlocked: {};
            locked: {};
          };
        };
        access: {
          states: {
            granted: {};
            denied: {};
          };
        };
      };
    };
  };
}

export type EditorContext<Content> = {
  content: Content;
};

type AccessEvent = {
  type: 'ACCESS_DENIED' | 'ACCESS_GRANTED';
};

type ContentEvent<Content> = {
  type: 'CONTENT_UPDATED';
  content: Content;
};

type LocksEvent = {
  type: 'FOREIGN_LOCK_ADDED' | 'FOREIGN_LOCK_RELEASED' | 'LOCAL_LOCK_RELEASED';
};

export type EditorEvent<Content> =
  | AccessEvent
  | ContentEvent<Content>
  | LocksEvent;

interface EditorMachineConfig<Content> {
  contentIsDirty: (
    previousContent: Content | undefined,
    currentContent: Content,
  ) => boolean;
  onActive: () => void;
  onContentDirty: (state: Content) => void;
  onEditable: () => void;
  onIdle: () => void;
  onResetEditor: () => void;
  onUneditable: () => void;
  TIME_BEFORE_IDLE: number;
}

export const createEditorMachine = <Content>({
  contentIsDirty,
  onActive,
  onContentDirty,
  onEditable,
  onIdle,
  onResetEditor,
  onUneditable,
  TIME_BEFORE_IDLE,
}: EditorMachineConfig<Content>) =>
  Machine<
    EditorContext<Content | undefined>,
    EditorStateSchema,
    EditorEvent<Content>
  >(
    {
      id: 'editor',
      context: {
        content: undefined,
      },
      initial: 'editable',
      states: {
        editable: {
          initial: 'pristine',
          onEntry: ['notifyEditable'],
          on: {
            FOREIGN_LOCK_ADDED: {
              target: '#editor.uneditable.lock.locked',
            },
            ACCESS_DENIED: {
              target: '#editor.uneditable.access.denied',
            },
          },
          states: {
            pristine: {
              onEntry: ['resetContent', 'notifyResetEditor'],
              on: {
                CONTENT_UPDATED: [
                  {
                    target: 'dirty',
                    cond: 'contentIsDirty',
                    actions: ['updateContent'],
                  },
                  {
                    target: 'pristine',
                    actions: ['updateContent'],
                    internal: true,
                  },
                ],
              },
              initial: 'active',
              states: {
                active: {
                  onEntry: ['notifyActive'],
                  after: {
                    [TIME_BEFORE_IDLE]: {
                      target: 'idle',
                    },
                  },
                },
                idle: {
                  onEntry: ['notifyIdle'],
                },
              },
            },
            dirty: {
              onEntry: ['notifyContentDirty'],
              on: {
                LOCAL_LOCK_RELEASED: {
                  target: '#editor.editable',
                },
                CONTENT_UPDATED: {
                  target: 'dirty',
                  actions: ['updateContent'],
                },
              },
              initial: 'active',
              states: {
                active: {
                  onEntry: ['notifyActive'],
                  after: {
                    [TIME_BEFORE_IDLE]: {
                      target: 'idle',
                    },
                  },
                },
                idle: {
                  onEntry: ['notifyIdle'],
                },
              },
            },
          },
        },
        uneditable: {
          type: 'parallel',
          onEntry: ['notifyUneditable', 'notifyResetEditor'],
          states: {
            lock: {
              initial: 'unlocked',
              states: {
                unlocked: {
                  on: {
                    FOREIGN_LOCK_ADDED: {
                      target: 'locked',
                    },
                  },
                },
                locked: {
                  on: {
                    FOREIGN_LOCK_RELEASED: [
                      {
                        target: '#editor.editable.pristine',
                        in: 'access.granted',
                      },
                      {
                        target: 'unlocked',
                      },
                    ],
                  },
                },
              },
            },
            access: {
              initial: 'granted',
              states: {
                granted: {
                  on: {
                    ACCESS_DENIED: {
                      target: 'denied',
                    },
                  },
                },
                denied: {
                  on: {
                    ACCESS_GRANTED: [
                      {
                        target: '#editor.editable.pristine',
                        in: 'lock.unlocked',
                      },
                      {
                        target: 'granted',
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
    },
    {
      actions: {
        resetContent: createResetContent(),
        updateContent: createUpdateContent(),
        notifyContentDirty: (ctx, event) => {
          const { content } = event as ContentEvent<Content>;
          onContentDirty(content);
        },
        notifyActive: onActive,
        notifyEditable: onEditable,
        notifyIdle: onIdle,
        notifyResetEditor: onResetEditor,
        notifyUneditable: onUneditable,
      },
      guards: {
        contentIsDirty: (ctx, event) => {
          const { content } = event as ContentEvent<Content>;
          return contentIsDirty(ctx.content, content);
        },
      },
    },
  );

function createUpdateContent<Content>() {
  return assign<EditorContext<Content | undefined>, ContentEvent<Content>>({
    content: (ctx, event) => event.content,
  });
}

function createResetContent<Content>() {
  return assign<EditorContext<Content | undefined>, ContentEvent<Content>>({
    content: () => undefined,
  });
}
