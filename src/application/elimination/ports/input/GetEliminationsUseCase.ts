/**
 * Query for getting eliminations by game date.
 */
export interface GetEliminationsQuery {
  gameDateId: number;
}

/**
 * Elimination data returned by queries.
 */
export interface EliminationDTO {
  id: number;
  gameDateId: number;
  position: number;
  points: number;
  eliminatedPlayer: {
    id: string;
    firstName: string;
    lastName: string;
  };
  eliminatorPlayer: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  eliminationTime: string;
}

/**
 * Input port for querying eliminations.
 */
export interface GetEliminationsUseCase {
  execute(query: GetEliminationsQuery): Promise<EliminationDTO[]>;
}
