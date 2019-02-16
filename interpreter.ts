import { EventObject, State, StateMachine } from 'xstate';
import { actionTypes } from 'xstate/lib/actions';

type InterpreterOptions = {
  debug: boolean;
};

export type Interpreter<Context, Event extends EventObject> = {
  send(state: State<Context, Event>, event: Event): void;
  start(): void;
};

/**
 * Returns a stateless statechart interpreter as a complement to the stateful
 * equivalent included in XState.
 */
export function createInterpreter<Context, Schema, Event extends EventObject>(
  machine: StateMachine<Context, Schema, Event>,
  onTransition: (state: State<Context, Event>) => void,
  { debug }: InterpreterOptions = { debug: false },
): Interpreter<Context, Event> {
  return {
    send: (state, event) => {
      const nextState = machine.transition(state, event, state.context);

      if (debug) {
        console.log(`${state.toStrings()} => ${nextState.toStrings()}`);
      }

      onTransition(nextState);

      nextState.actions.forEach(action => {
        if (action.exec) {
          if (debug) {
            console.log(action.type);
          }
          action.exec(nextState.context, event, { action });
        }
      });
    },
    start: () => {
      const nextState = machine.initialState;

      if (debug) {
        console.log(
          `${machine.initialState.toStrings()} => ${nextState.toStrings()}`,
        );
      }

      onTransition(nextState);

      nextState.actions.forEach(action => {
        if (action.exec) {
          if (debug) {
            console.log(action.type);
          }
          action.exec(
            nextState.context,
            { type: actionTypes.nullEvent } as Event,
            { action },
          );
        }
      });
    },
  };
}
