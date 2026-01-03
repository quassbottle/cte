import { IrcClient } from '@ctrl/irc';
import {
  MpChannel,
  MpSetScoreMode,
  MpSetVsMode,
  MpTeamColor,
  OsuMpMode,
} from './types';

const OSU_IRC_BASE_CHANNEL = 'BanchoBot';

export class OsuIrcClient extends IrcClient {
  constructor(params: {
    host: string;
    nick: string;
    port: number;
    password?: string;
  }) {
    super(params.host, params.nick, {
      channels: [],
      port: params.port,
      password: params.password,
    });
  }

  private mp(channel: string, command: string): void {
    this.say(channel, `!mp ${command}`.trim());
  }

  public roll(channel?: string): void {
    this.say(channel ?? OSU_IRC_BASE_CHANNEL, '!roll');
  }

  public mpCheckPermission(channel: MpChannel): void {
    this.mp(channel, 'checkperm');
  }

  public mpListRef(channel: MpChannel): void {
    this.mp(channel, 'listref');
  }

  public mpAddRef(channel: MpChannel, params: { username: string }): void {
    this.mp(channel, `addref ${params.username}`);
  }

  public mpRmRef(channel: MpChannel, params: { username: string }): void {
    this.mp(channel, `rmref ${params.username}`);
  }

  public mpMake(params: { name: string }): void {
    this.mp(OSU_IRC_BASE_CHANNEL, `make ${params.name}`);
  }

  public mpMakePrivate(params: { name: string }): void {
    this.mp(OSU_IRC_BASE_CHANNEL, `makeprivate ${params.name}`);
  }

  public mpClose(channel: MpChannel): void {
    this.mp(channel, `close`);
  }

  public mpLock(channel: MpChannel): void {
    this.mp(channel, 'lock');
  }

  public mpUnlock(channel: MpChannel): void {
    this.mp(channel, 'unlock');
  }

  public mpPassword(channel: MpChannel, params: { password: string }): void {
    this.mp(channel, `password ${params.password}`);
  }

  public mpSize(channel: MpChannel, params: { size: number }): void {
    // osu: 2-16
    const clamped = Math.max(2, Math.min(16, Math.floor(params.size)));
    this.mp(channel, `size ${clamped}`);
  }

  public mpMove(channel: MpChannel, params: { slot: number }): void {
    const normalized = Math.max(1, Math.min(16, Math.floor(params.slot)));
    this.mp(channel, `move ${normalized}`);
  }

  public mpHost(channel: MpChannel, params: { username: string }): void {
    this.mp(channel, `host ${params.username}`);
  }

  public mpClearHost(channel: MpChannel): void {
    this.mp(channel, 'clearhost');
  }

  public mpTeam(
    channel: MpChannel,
    params: {
      username: string;
      color: MpTeamColor;
    },
  ): void {
    const { username, color } = params;
    this.mp(channel, `team ${username} ${color}`);
  }

  public mpMods(channel: MpChannel, params: { mods: string }): void {
    this.mp(channel, `mods ${params.mods}`);
  }

  public mpScoreV(channel: MpChannel, version: 1 | 2): void {
    this.mp(channel, `scorev ${version}`);
  }

  public mpSet(
    channel: MpChannel,
    params: {
      vsmode: MpSetVsMode;
      scoremode: MpSetScoreMode;
      size?: number;
    },
  ): void {
    const { vsmode, scoremode, size } = params;

    const tail =
      typeof size === 'number'
        ? ` ${Math.max(2, Math.min(16, Math.floor(size)))}`
        : '';
    this.mp(channel, `set ${vsmode} ${scoremode}${tail}`);
  }

  public mpSettings(channel: MpChannel): void {
    this.mp(channel, 'settings');
  }

  public mpInvite(channel: MpChannel, params: { username: string }): void {
    this.mp(channel, `invite ${params.username}`);
  }

  public mpMap(
    channel: MpChannel,
    params: {
      mapId: number | string;
      mode: OsuMpMode;
    },
  ): void {
    const { mapId, mode } = params;

    this.mp(channel, `map ${mapId} ${mode}`);
  }

  public mpTimer(channel: MpChannel, params?: { seconds?: number }): void {
    if (typeof params?.seconds === 'number') {
      const s = Math.max(0, Math.floor(params.seconds));
      this.mp(channel, `timer ${s}`);
      return;
    }
    this.mp(channel, 'timer');
  }

  public mpStart(channel: MpChannel, params?: { seconds?: number }): void {
    if (typeof params?.seconds === 'number') {
      const s = Math.max(0, Math.floor(params.seconds));
      this.mp(channel, `start ${s}`);
      return;
    }
    this.mp(channel, 'start');
  }

  public mpAbortTimer(channel: MpChannel): void {
    this.mp(channel, 'aborttimer');
  }

  public mpAbort(channel: MpChannel): void {
    this.mp(channel, 'abort');
  }

  public mpKick(channel: MpChannel, params: { username: string }): void {
    this.mp(channel, `kick ${params.username}`);
  }

  public mpHelp(channel: MpChannel): void {
    this.mp(channel, 'help');
  }
}
