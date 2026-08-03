import { assign, setup } from 'xstate';

export type GameEvent =
  | { type: 'BACK' }
  | { type: 'CONTROLS' }
  | { type: 'HELP' }
  | { type: 'LEADERBOARD' }
  | { type: 'PLAY' }
  | { type: 'PROFILE' }
  | { type: 'SETTINGS' }
  | { type: 'SIGN_IN' }
  | { type: 'SIGN_OUT' }
  | { type: 'SKIP_SIGN_IN' }
  | { type: 'TUTORIAL_COMPLETE' }
  | { type: 'TUTORIAL' };

export interface GameMachineContext {
  hasSeenTutorial: boolean;
  isSignedIn: boolean;
  tutorialBackTo: 'help' | 'mainMenu';
}

export const gameMachine = setup({
  types: {
    context: {} as GameMachineContext,
    events: {} as GameEvent,
  },
  guards: {
    hasSeenTutorial: ({ context }) => context.hasSeenTutorial,
    isSignedIn: ({ context }) => context.isSignedIn,
    tutorialFromHelp: ({ context }) => context.tutorialBackTo === 'help',
  },
  actions: {
    markTutorialSeen: assign({ hasSeenTutorial: true }),
    setSignedIn: assign({ isSignedIn: true }),
    setSignedOut: assign({ isSignedIn: false }),
    setTutorialBackToMain: assign({ tutorialBackTo: 'mainMenu' as const }),
    setTutorialBackToHelp: assign({ tutorialBackTo: 'help' as const }),
  },
}).createMachine({
  id: 'game',
  initial: 'launch',
  context: {
    hasSeenTutorial: false,
    isSignedIn: false,
    tutorialBackTo: 'mainMenu',
  },
  on: {
    SIGN_IN: { actions: 'setSignedIn' },
    SIGN_OUT: { actions: 'setSignedOut' },
  },
  states: {
    launch: {
      always: { target: 'mainMenu' },
    },

    mainMenu: {
      on: {
        PLAY: [
          { guard: 'hasSeenTutorial', target: 'playing' },
          {
            target: 'tutorial',
            actions: 'setTutorialBackToMain',
          },
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
        BACK: [
          { guard: 'tutorialFromHelp', target: 'help' },
          { target: 'mainMenu' },
        ],
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
        TUTORIAL: {
          target: '#game.tutorial',
          actions: 'setTutorialBackToHelp',
        },
      },
      states: {
        menu: {
          on: {
            CONTROLS: { target: 'controls' },
            BACK: { target: '#game.mainMenu' },
          },
        },
        controls: {
          on: { BACK: { target: 'menu' } },
        },
        rules: {
          on: { BACK: { target: 'menu' } },
        },
      },
    },

    profile: {
      on: {
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
