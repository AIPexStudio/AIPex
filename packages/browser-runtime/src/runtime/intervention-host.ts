export interface InterventionDescriptor {
  id: string;
  title: string;
  description?: string;
  category?: string;
  icon?: string;
}

export interface InterventionRequest<TPayload = unknown> {
  interventionId: string;
  payload?: TPayload;
  requestId?: string;
}

export interface InterventionUpdate<TState = unknown> {
  requestId: string;
  interventionId: string;
  state: TState;
  done?: boolean;
}

export interface InterventionHost {
  initialize?(): Promise<void>;
  list(): Promise<InterventionDescriptor[]>;
  request<TPayload>(
    request: InterventionRequest<TPayload>,
  ): Promise<InterventionUpdate>;
  cancel?(requestId: string): Promise<void>;
  subscribe?(
    listener: (update: InterventionUpdate) => void,
  ): () => void | Promise<() => void>;
}
