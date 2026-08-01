import { assign, setup } from 'xstate';

export type GameEvent =
  | { type: 'BACK' }
  | { type: 'CONTROLS' }
  | { type: 'FAQ' }
  | { type: 'HELP' }
  | { type: 'LEADERBOARD' }
  | { type: 'PLAY' }
  | { type: 'PROFILE' }
  | { type: 'REPLAY_TUTORIAL' }
  | { type: 'RULES' }
  | { type: 'SCORING' }
  | { type: 'SETTINGS' }
  | { type: 'SIGN_IN' }
  | { type: 'SIGN_OUT' }
  | { type: 'SKIP_SIGN_IN' }
  | { type: 'TUTORIAL_COMPLETE' };

export interface GameMachineContext {
  hasSeenTutorial: boolean;
  isSignedIn: boolean;
}

export const gameMachine = setup({
  types: {
    context: {} as GameMachineContext,
    events: {} as GameEvent,
  },
  guards: {
    hasSeenTutorial: ({ context }) => context.hasSeenTutorial,
    isSignedIn: ({ context }) => context.isSignedIn,
  },
  actions: {
    markTutorialSeen: assign({ hasSeenTutorial: true }),
    setSignedIn: assign({ isSignedIn: true }),
    setSignedOut: assign({ isSignedIn: false }),
  },
}).createMachine({
  id: 'game',
  initial: 'launch',
  context: {
    hasSeenTutorial: false,
    isSignedIn: false,
  },
  states: {
    launch: {
      always: { target: 'mainMenu' },
    },

    mainMenu: {
      on: {
        PLAY: [
          { guard: 'hasSeenTutorial', target: 'playing' },
          { target: 'tutorial' },
        ],
        LEADERBOARD: [
          { guard: 'isSignedIn', target: 'leaderboard' },
          { target: 'askSignIn' },
        ],
        HELP: { target: 'help' },
        PROFILE: { target: 'profile' },
        SETTINGS: { target: 'settings' },
      },
    },

    tutorial: {
      on: {
        TUTORIAL_COMPLETE: {
          target: 'playing',
          actions: 'markTutorialSeen',
        },
        BACK: { target: 'mainMenu' },
      },
    },

    playing: {
      on: {
        BACK: { target: 'mainMenu' },
      },
    },

    askSignIn: {
      on: {
        SIGN_IN: {
          target: 'leaderboard',
          actions: 'setSignedIn',
        },
        SKIP_SIGN_IN: { target: 'leaderboard' },
        BACK: { target: 'mainMenu' },
      },
    },

    leaderboard: {
      on: {
        BACK: { target: 'mainMenu' },
      },
    },

    help: {
      initial: 'menu',
      on: {
        REPLAY_TUTORIAL: { target: '#game.tutorial' },
      },
      states: {
        menu: {
          on: {
            CONTROLS: { target: 'controls' },
            RULES: { target: 'rules' },
            SCORING: { target: 'scoring' },
            FAQ: { target: 'faq' },
            BACK: { target: '#game.mainMenu' },
          },
        },
        controls: {
          on: { BACK: { target: 'menu' } },
        },
        rules: {
          on: { BACK: { target: 'menu' } },
        },
        scoring: {
          on: { BACK: { target: 'menu' } },
        },
        faq: {
          on: { BACK: { target: 'menu' } },
        },
      },
    },

    profile: {
      on: {
        SIGN_IN: { actions: 'setSignedIn' },
        SIGN_OUT: { actions: 'setSignedOut' },
        BACK: { target: 'mainMenu' },
      },
    },

    settings: {
      on: {
        BACK: { target: 'mainMenu' },
      },
    },
  },
});

export type GameMachine = typeof gameMachine;
