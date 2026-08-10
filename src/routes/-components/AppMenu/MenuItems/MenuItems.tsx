import { useGame } from '@/context/GameContext';

import { AskGuestOrSignUpMenu } from './AskGuestOrSignUpMenu';
import { CelebratingMenu } from './CelebratingMenu';
import { ConfirmDeleteAccountMenu } from './ConfirmDeleteAccountMenu';
import { EditProfileMenu } from './EditProfileMenu';
import { GameCompletedMenu } from './GameCompletedMenu';
import { HelpControlsMenu } from './HelpControlsMenu';
import { HelpMenu } from './HelpMenu';
import { HelpRulesMenu } from './HelpRulesMenu';
import { LeaderboardMenu } from './LeaderboardMenu';
import { LevelCompletedMenu } from './LevelCompletedMenu';
import { MainMenu } from './MainMenu';
import { PausedMenu } from './PausedMenu';
import { ProfileMenu } from './ProfileMenu';
import { SettingsMenu } from './SettingsMenu';
import { SignInMenu } from './SignInMenu';
import { SignUpMenu } from './SignUpMenu';
import { UpgradeAccountMenu } from './UpgradeAccountMenu';

export function MenuItems() {
  const { state } = useGame();

  if (state.matches('playing')) return null;

  // main menu
  if (state.matches('mainMenu')) return <MainMenu />;
  if (state.matches('profile')) return <ProfileMenu />;
  if (state.matches('leaderboard')) return <LeaderboardMenu />;
  if (state.matches('settings')) return <SettingsMenu />;

  // paused menu
  if (state.matches({ paused: 'menu' })) return <PausedMenu />;
  if (state.matches({ paused: 'settings' })) return <SettingsMenu />;
  if (state.matches({ paused: { help: 'menu' } })) return <HelpMenu />;
  if (state.matches({ paused: { help: 'controls' } }))
    return <HelpControlsMenu />;
  if (state.matches({ paused: { help: 'rules' } })) return <HelpRulesMenu />;

  // help menu
  if (state.matches({ help: 'menu' })) return <HelpMenu />;
  if (state.matches({ help: 'controls' })) return <HelpControlsMenu />;
  if (state.matches({ help: 'rules' })) return <HelpRulesMenu />;

  // level completed states
  if (state.matches('celebrating')) return <CelebratingMenu />;
  if (state.matches('gameCompleted')) return <GameCompletedMenu />;
  if (state.matches('levelCompleted')) return <LevelCompletedMenu />;

  // sign in/up/out menu
  if (state.matches('askGuestOrSignUp')) return <AskGuestOrSignUpMenu />;
  if (state.matches('signUp')) return <SignUpMenu />;
  if (state.matches('signIn')) return <SignInMenu />;

  // Profile menu
  if (state.matches('confirmDeleteAccount'))
    return <ConfirmDeleteAccountMenu />;
  if (state.matches('upgradeAccount')) return <UpgradeAccountMenu />;
  if (state.matches('editProfile')) return <EditProfileMenu />;

  return null;
}
