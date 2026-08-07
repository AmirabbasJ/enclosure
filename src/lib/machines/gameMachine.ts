import { and, assign, emit, setup } from 'xstate';

import type { Metadata } from '../../data/metadata/metadata.functions';

import { defaultMetadata } from '../../data/metadata/metadata.functions';

export type GameEvent =
  | { type: 'BACK' }
  | { type: 'CONTINUE_AS_GUEST' }
  | { type: 'CONTROLS' }
  | { type: 'HELP' }
  | { type: 'LEADERBOARD' }
  | { type: 'OPEN_SIGN_IN' }
  | { type: 'PAUSE' }
  | { type: 'PLAY' }
  | { type: 'PROFILE' }
  | { type: 'RULES' }
  | { type: 'SETTINGS' }
  | { type: 'SIGN_IN' }
  | { type: 'SIGN_OUT' }
  | { type: 'SIGN_UP' }
  | { type: 'SKIP_SIGN_IN' }
  | { type: 'TUTORIAL_COMPLETE' }
  | { type: 'TUTORIAL' };

export type PendingAction = 'play' | 'profile';

export interface GameMachineContext {
  metadata: Metadata;
  isSignedIn: boolean;
  tutorialBackTo: 'help' | 'mainMenu';
  pendingAction: PendingAction | null;
}

export const gameMachine = setup({
  types: {
    context: {} as GameMachineContext,
    events: {} as GameEvent,

    input: {} as {
      metadata?: Metadata;
      isSignedIn?: boolean;
    },
    emitted: {} as { type: 'TUTORIAL_COMPLETE' },
  },
  guards: {
    hasViewedTutorial: ({ context }) => context.metadata.hasViewedTutorial,
    isSignedIn: ({ context }) => context.isSignedIn,
    tutorialFromHelp: ({ context }) => context.tutorialBackTo === 'help',
  },
  actions: {
    markTutorialSeen: assign({
      metadata: ({ context }) => ({
        ...context.metadata,
        hasViewedTutorial: true,
      }),
    }),
    setSignedIn: assign({ isSignedIn: true }),
    setSignedOut: assign({ isSignedIn: false }),

    setTutorialBackToMain: assign({ tutorialBackTo: 'mainMenu' as const }),
    setTutorialBackToHelp: assign({ tutorialBackTo: 'help' as const }),

    setPendingPlay: assign({ pendingAction: 'play' as const }),
    setPendingProfile: assign({ pendingAction: 'profile' as const }),
    clearPendingAction: assign({ pendingAction: null }),
  },
}).createMachine({
  id: 'game',
  initial: 'mainMenu',
  context: ({ input }) => ({
    metadata: input.metadata ?? defaultMetadata,
    isSignedIn: input.isSignedIn ?? false,
    tutorialBackTo: 'mainMenu',
    pendingAction: null,
  }),
  on: {
    SIGN_IN: { actions: 'setSignedIn' },
    SIGN_OUT: { actions: 'setSignedOut' },
  },
  states: {
    mainMenu: {
      on: {
        PLAY: [
          {
            guard: and(['isSignedIn', 'hasViewedTutorial']),
            target: 'playing',
          },
          {
            guard: 'isSignedIn',
            target: 'tutorial',
            actions: 'setTutorialBackToMain',
          },
          {
            target: 'askGuestOrSignUp',
            actions: 'setPendingPlay',
          },
        ],
        LEADERBOARD: [
          { guard: 'isSignedIn', target: 'leaderboard' },
          { target: 'askSignIn' },
        ],
        HELP: { target: 'help' },
        OPEN_SIGN_IN: { target: 'signIn' },
        SETTINGS: { target: 'settings' },
        PROFILE: [
          { guard: 'isSignedIn', target: 'profile' },
          {
            target: 'askGuestOrSignUp',
            actions: 'setPendingProfile',
          },
        ],
      },
    },

    askGuestOrSignUp: {
      on: {
        CONTINUE_AS_GUEST: { target: 'routeAfterAuth' },
        SIGN_UP: { target: 'signUp' },
        BACK: {
          target: 'mainMenu',
          actions: 'clearPendingAction',
        },
      },
    },

    signUp: {
      on: {
        SIGN_IN: {
          target: 'routeAfterAuth',
          actions: 'setSignedIn',
        },
        BACK: { target: 'askGuestOrSignUp' },
      },
    },

    routeAfterAuth: {
      always: [
        {
          guard: ({ context }) => context.pendingAction === 'profile',
          target: 'profile',
          actions: 'clearPendingAction',
        },
        {
          guard: 'hasViewedTutorial',
          target: 'playing',
          actions: 'clearPendingAction',
        },
        {
          target: 'tutorial',
          actions: ['setTutorialBackToMain', 'clearPendingAction'],
        },
      ],
    },

    tutorial: {
      on: {
        TUTORIAL_COMPLETE: {
          target: 'playing',
          actions: ['markTutorialSeen', emit({ type: 'TUTORIAL_COMPLETE' })],
        },
        BACK: [
          { guard: 'tutorialFromHelp', target: 'help' },
          { target: 'mainMenu' },
        ],
      },
    },

    playing: {
      on: {
        PAUSE: { target: 'paused' },
        BACK: { target: 'mainMenu' },
      },
    },

    paused: {
      on: {
        PLAY: { target: 'playing' },
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

    profile: {
      on: {
        BACK: { target: 'mainMenu' },
        SIGN_OUT: { target: 'mainMenu', actions: 'setSignedOut' },
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
            RULES: { target: 'rules' },
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

    signIn: {
      on: {
        SIGN_IN: {
          target: 'mainMenu',
          actions: 'setSignedIn',
        },
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
