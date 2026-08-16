import { and, assign, emit, setup } from 'xstate';

import type { Metadata } from '../../data/metadata/metadata.functions';

import { defaultMetadata } from '../../data/metadata/metadata.functions';

export type GameEvent =
  | { type: 'BACK' }
  | { type: 'CONTINUE_AS_GUEST' }
  | { type: 'CONTROLS' }
  | { type: 'DELETE_ACCOUNT' }
  | { type: 'EDIT_PROFILE' }
  | { type: 'HELP' }
  | { type: 'LEADERBOARD' }
  | { type: 'LEVEL_COMPLETED'; finished: boolean; levelId: number }
  | { type: 'NEXT_LEVEL' }
  | { type: 'PAUSE' }
  | { type: 'PLAY' }
  | { type: 'PROFILE' }
  | { type: 'PROGRESS_UPDATED'; finished: boolean }
  | { type: 'RULES' }
  | { type: 'SETTINGS' }
  | { type: 'SIGN_IN' }
  | { type: 'SIGN_OUT' }
  | { type: 'SIGN_UP' }
  | { type: 'TUTORIAL_COMPLETE' }
  | { type: 'TUTORIAL' }
  | { type: 'UPGRADE_ACCOUNT' };

export type PendingAction = 'play' | 'profile';

export interface GameMachineContext {
  metadata: Metadata;
  isSignedIn: boolean;
  finished: boolean;
  completedLevelId: number | null;
  isTutorial: boolean;
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
      finished?: boolean;
    },
    emitted: {} as { type: 'TUTORIAL_COMPLETE' },
  },
  guards: {
    hasFinishedGame: ({ context }) => context.finished,
    hasViewedTutorial: ({ context }) => context.metadata.hasViewedTutorial,
    isLastLevel: ({ event }) =>
      event.type === 'LEVEL_COMPLETED' && event.finished,
    isSignedIn: ({ context }) => context.isSignedIn,
    isTutorial: ({ context }) => context.isTutorial,
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
    setSignedOut: assign({
      isSignedIn: false,
      finished: false,
      isTutorial: false,
    }),
    setFinishedFromProgress: assign({
      finished: ({ context, event }) =>
        event.type === 'PROGRESS_UPDATED' ? event.finished : context.finished,
    }),
    markGameFinished: assign({ finished: true }),
    setCompletedLevelId: assign({
      completedLevelId: ({ event }) =>
        event.type === 'LEVEL_COMPLETED' ? event.levelId : null,
    }),
    clearCompletedLevelId: assign({ completedLevelId: null }),

    setIsTutorial: assign({ isTutorial: true }),
    clearIsTutorial: assign({ isTutorial: false }),

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
    finished: input.finished ?? false,
    completedLevelId: null,
    isTutorial: false,
    tutorialBackTo: 'mainMenu',
    pendingAction: null,
  }),
  on: {
    SIGN_IN: { actions: 'setSignedIn' },
    SIGN_OUT: { actions: 'setSignedOut' },
    PROGRESS_UPDATED: { actions: 'setFinishedFromProgress' },
  },
  states: {
    mainMenu: {
      on: {
        PLAY: [
          {
            guard: 'hasFinishedGame',
            target: 'gameCompleted',
          },
          {
            guard: and(['isSignedIn', 'hasViewedTutorial']),
            target: 'playing',
            actions: 'clearIsTutorial',
          },
          {
            guard: 'isSignedIn',
            target: 'playing',
            actions: ['setIsTutorial', 'setTutorialBackToMain'],
          },
          {
            target: 'askGuestOrSignUp',
            actions: 'setPendingPlay',
          },
        ],
        LEADERBOARD: { target: 'leaderboard' },
        HELP: { target: 'help' },
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
          guard: 'hasFinishedGame',
          target: 'gameCompleted',
          actions: ['clearIsTutorial', 'clearPendingAction'],
        },
        {
          guard: 'hasViewedTutorial',
          target: 'playing',
          actions: ['clearIsTutorial', 'clearPendingAction'],
        },
        {
          target: 'playing',
          actions: [
            'setIsTutorial',
            'setTutorialBackToMain',
            'clearPendingAction',
          ],
        },
      ],
    },

    tutorial: {
      on: {
        BACK: [
          { guard: 'tutorialFromHelp', target: 'help' },
          { target: 'mainMenu' },
        ],
      },
    },

    playing: {
      on: {
        LEVEL_COMPLETED: [
          {
            guard: 'isTutorial',
            target: 'celebrating',
            actions: [
              'setCompletedLevelId',
              'markTutorialSeen',
              'clearIsTutorial',
              emit({ type: 'TUTORIAL_COMPLETE' }),
            ],
          },
          {
            guard: 'isLastLevel',
            target: 'celebrating',
            actions: ['setCompletedLevelId', 'markGameFinished'],
          },
          {
            target: 'celebrating',
            actions: 'setCompletedLevelId',
          },
        ],
        PAUSE: { target: 'paused' },
        BACK: [
          {
            guard: and(['isTutorial', 'tutorialFromHelp']),
            target: 'help',
            actions: 'clearIsTutorial',
          },
          { target: 'mainMenu', actions: 'clearIsTutorial' },
        ],
      },
    },

    paused: {
      initial: 'menu',
      states: {
        menu: {
          on: {
            PLAY: { target: '#game.playing' },
            SETTINGS: { target: 'settings' },
            HELP: { target: 'help' },
            BACK: [
              {
                guard: and(['isTutorial', 'tutorialFromHelp']),
                target: '#game.help',
                actions: 'clearIsTutorial',
              },
              { target: '#game.mainMenu', actions: 'clearIsTutorial' },
            ],
          },
        },
        settings: {
          on: {
            BACK: { target: 'menu' },
          },
        },
        help: {
          initial: 'menu',
          states: {
            menu: {
              on: {
                CONTROLS: { target: 'controls' },
                RULES: { target: 'rules' },
                BACK: { target: '#game.paused.menu' },
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
      },
    },

    celebrating: {
      after: {
        1600: [
          { guard: 'hasFinishedGame', target: 'gameCompleted' },
          { target: 'levelCompleted' },
        ],
      },
    },

    levelCompleted: {
      on: {
        NEXT_LEVEL: {
          target: 'playing',
          actions: 'clearCompletedLevelId',
        },
        BACK: { target: 'mainMenu', actions: 'clearCompletedLevelId' },
      },
    },

    gameCompleted: {
      on: {
        BACK: { target: 'mainMenu', actions: 'clearCompletedLevelId' },
      },
    },

    profile: {
      on: {
        UPGRADE_ACCOUNT: { target: 'upgradeAccount' },
        EDIT_PROFILE: { target: 'editProfile' },
        DELETE_ACCOUNT: { target: 'confirmDeleteAccount' },
        BACK: { target: 'mainMenu' },
        SIGN_OUT: { target: 'mainMenu', actions: 'setSignedOut' },
      },
    },

    upgradeAccount: {
      on: {
        BACK: { target: 'profile' },
      },
    },

    editProfile: {
      on: {
        BACK: { target: 'profile' },
      },
    },

    confirmDeleteAccount: {
      on: {
        BACK: { target: 'profile' },
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
          target: '#game.playing',
          actions: ['setIsTutorial', 'setTutorialBackToHelp'],
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

    settings: {
      on: {
        BACK: { target: 'mainMenu' },
      },
    },
  },
});

export type GameMachine = typeof gameMachine;
