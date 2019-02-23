import { createEditorMachine } from './statechart';

interface ExampleContent {
  data: string;
  dirty: boolean;
}

const editorMachine = createEditorMachine<ExampleContent>({
  contentIsDirty: (_, content) => content.dirty,
  onActive: () => {},
  onContentDirty: () => {},
  onEditable: () => {},
  onIdle: () => {},
  onResetEditor: () => {},
  onUneditable: () => {},
  TIME_BEFORE_IDLE: 500,
});

test('notifies of being editable when access is granted', () => {
  expect(
    editorMachine
      .transition('uneditable.access.denied', { type: 'ACCESS_GRANTED' })
      .actions.find(action => action.type === 'notifyEditable'),
  ).toBeDefined();
});

test('notifies of being editable when foreign lock is released', () => {
  expect(
    editorMachine
      .transition('uneditable.lock.locked', { type: 'FOREIGN_LOCK_RELEASED' })
      .actions.find(action => action.type === 'notifyEditable'),
  ).toBeDefined();
});

test('resets the editor when foreign lock is released', () => {
  expect(
    editorMachine
      .transition('uneditable.lock.locked', { type: 'FOREIGN_LOCK_RELEASED' })
      .actions.find(action => action.type === 'notifyResetEditor'),
  ).toBeDefined();
});

test('resets the editor when access is granted', () => {
  expect(
    editorMachine
      .transition('uneditable.access.denied', { type: 'ACCESS_GRANTED' })
      .actions.find(action => action.type === 'notifyResetEditor'),
  ).toBeDefined();
});

test('resets the editor when local lock is released', () => {
  expect(
    editorMachine
      .transition('editable.dirty', { type: 'LOCAL_LOCK_RELEASED' })
      .actions.find(action => action.type === 'notifyResetEditor'),
  ).toBeDefined();
});

test('resets the editor when access is denied', () => {
  expect(
    editorMachine
      .transition('editable.pristine', { type: 'ACCESS_DENIED' })
      .actions.find(action => action.type === 'notifyResetEditor'),
  ).toBeDefined();

  expect(
    editorMachine
      .transition('editable.dirty', { type: 'ACCESS_DENIED' })
      .actions.find(action => action.type === 'notifyResetEditor'),
  ).toBeDefined();
});

test('notifies of being uneditable when access is denied', () => {
  expect(
    editorMachine
      .transition('editable.pristine', { type: 'ACCESS_DENIED' })
      .actions.find(action => action.type === 'notifyUneditable'),
  ).toBeDefined();

  expect(
    editorMachine
      .transition('editable.dirty', { type: 'ACCESS_DENIED' })
      .actions.find(action => action.type === 'notifyUneditable'),
  ).toBeDefined();
});

test('resets the editor when foreign lock is added', () => {
  expect(
    editorMachine
      .transition('editable.pristine', { type: 'FOREIGN_LOCK_ADDED' })
      .actions.find(action => action.type === 'notifyResetEditor'),
  ).toBeDefined();
});

test('notifies of being uneditable when foreign lock is added', () => {
  expect(
    editorMachine
      .transition('editable.pristine', { type: 'FOREIGN_LOCK_ADDED' })
      .actions.find(action => action.type === 'notifyUneditable'),
  ).toBeDefined();
});

test('resets the editor when lock is stolen', () => {
  expect(
    editorMachine
      .transition('editable.dirty', { type: 'FOREIGN_LOCK_ADDED' })
      .actions.find(action => action.type === 'notifyResetEditor'),
  ).toBeDefined();
});

test('notifies of being uneditable when lock is stolen', () => {
  expect(
    editorMachine
      .transition('editable.dirty', { type: 'FOREIGN_LOCK_ADDED' })
      .actions.find(action => action.type === 'notifyUneditable'),
  ).toBeDefined();
});

test('notifies of content being or becoming dirty', () => {
  expect(
    editorMachine
      .transition('editable.pristine', {
        type: 'CONTENT_UPDATED',
        content: {
          data: 'foo',
          dirty: false,
        },
      })
      .actions.find(action => action.type === 'notifyContentDirty'),
  ).toBeUndefined();

  expect(
    editorMachine
      .transition('editable.pristine', {
        type: 'CONTENT_UPDATED',
        content: {
          data: 'bar',
          dirty: true,
        },
      })
      .actions.find(action => action.type === 'notifyContentDirty'),
  ).toBeDefined();

  expect(
    editorMachine
      .transition('editable.dirty', {
        type: 'CONTENT_UPDATED',
        content: {
          data: 'baz',
          dirty: true,
        },
      })
      .actions.find(action => action.type === 'notifyContentDirty'),
  ).toBeDefined();

  expect(
    editorMachine
      .transition('editable.dirty', {
        type: 'CONTENT_UPDATED',
        content: {
          data: 'foo',
          dirty: false,
        },
      })
      .actions.find(action => action.type === 'notifyContentDirty'),
  ).toBeDefined();
});
