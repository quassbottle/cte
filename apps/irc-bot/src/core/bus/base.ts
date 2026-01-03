import { Maybe } from 'core/utils/types';

export interface OsuEventArgs {
  user: string;
}

export type EventContext<
  TEvent extends string | number,
  TEventArgsMap extends Record<TEvent, unknown>,
  TMeta,
> = {
  event: TEvent;
  data: TEventArgsMap[TEvent];
  meta: TMeta;
};

export type EventMiddleware<
  TEvent extends string | number,
  TEventArgsMap extends Record<TEvent, unknown>,
  TMeta,
> = (context: EventContext<TEvent, TEventArgsMap, TMeta>) => boolean | void;

export abstract class BaseEventBus<
  TEvent extends string | number,
  TEventArgsMap extends Record<TEvent, unknown>,
  TMeta = unknown,
> {
  private readonly listeners: {
    [key in TEvent]?: Array<
      (data: TEventArgsMap[key], meta: TMeta) => void | Promise<void>
    >;
  } = {};

  private readonly middlewares: Array<
    EventMiddleware<TEvent, TEventArgsMap, TMeta>
  > = [];

  protected abstract toEvent(rawCommand: string): TEvent | undefined;
  protected abstract parseArgs<T extends TEvent>(
    event: T,
    meta: TMeta,
    ...args: string[]
  ): TEventArgsMap[T];

  public use(middleware: EventMiddleware<TEvent, TEventArgsMap, TMeta>): void {
    this.middlewares.push(middleware);
  }

  public on<T extends TEvent>(
    event: T,
    listener: (data: TEventArgsMap[T], meta: TMeta) => void | Promise<void>,
  ): void {
    this.listeners[event] ??= [];
    this.listeners[event]!.push(listener);
  }

  public emit<T extends TEvent>(
    event: Maybe<T>,
    data: TEventArgsMap[T],
    meta: TMeta,
  ): void;
  public emit(event: Maybe<string>, data: string[], meta: TMeta): void;

  public emit<T extends TEvent>(
    event: Maybe<TEvent | string>,
    data: TEventArgsMap[T] | string[],
    meta: TMeta,
  ): void {
    if (event === undefined || event === null) return;

    const mappedEvent = typeof event === 'string' ? this.toEvent(event) : event;
    if (mappedEvent === undefined || mappedEvent === null) {
      // TODO: add proper logging
      return;
    }

    const context: EventContext<TEvent, TEventArgsMap, TMeta> = {
      event: mappedEvent,
      data: Array.isArray(data)
        ? this.parseArgs(mappedEvent as T, meta, ...data)
        : (data as TEventArgsMap[TEvent]),
      meta,
    };

    for (const middleware of this.middlewares) {
      const result = middleware(context);
      if (result === false) {
        return;
      }
    }

    for (const listener of this.listeners[mappedEvent] ?? []) {
      void listener(context.data as TEventArgsMap[T], context.meta);
    }
  }
}
