import { Machine, StateSchema } from 'xstate';

export interface EditorStateSchema extends StateSchema {
  states: {
    editable: {
      states: {
        pristine: {};
        dirty: {};
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
    previousContent: Content,
    currentContent: Content,
  ) => boolean;
  onContentDirty: (state: Content) => void;
  onEditable: () => void;
  onResetEditor: () => void;
  onUneditable: () => void;
}

export const createEditorMachine = <Content>({
  contentIsDirty,
  onContentDirty,
  onEditable,
  onResetEditor,
  onUneditable,
}: EditorMachineConfig<Content>) =>
  Machine<EditorContext<Content>, EditorStateSchema, EditorEvent<Content>>(
    {
      id: 'editor',
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
              onEntry: ['notifyResetEditor'],
              on: {
                CONTENT_UPDATED: {
                  target: 'dirty',
                  cond: 'contentIsDirty',
                },
              },
            },
            dirty: {
              onEntry: ['notifyContentDirty'],
              on: {
                LOCAL_LOCK_RELEASED: {
                  target: 'pristine',
                },
                CONTENT_UPDATED: {
                  actions: ['notifyContentDirty'],
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
        notifyContentDirty: (ctx, { content }: ContentEvent<Content>) => {
          onContentDirty(content);
        },
        notifyEditable: onEditable,
        notifyResetEditor: onResetEditor,
        notifyUneditable: onUneditable,
      },
      guards: {
        contentIsDirty: (ctx, { content }: ContentEvent<Content>) =>
          contentIsDirty(ctx.content, content),
      },
    },
  );
