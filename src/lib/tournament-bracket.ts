// Tournament Bracket Generation Utilities
// Handles bracket generation for single elimination, double elimination, and round robin

export type BracketType = 'single_elimination' | 'double_elimination' | 'round_robin'

export interface TournamentTeam {
  id: string
  name: string
  seed?: number
}

export interface Match {
  round: number
  match_number: number
  team1_id: string | null
  team2_id: string | null
  winner_id?: string | null
  is_bye: boolean
  next_round?: number
  next_match_number?: number
  next_is_third_place?: boolean
  next_match_position?: number
  loser_next_round?: number
  loser_next_match_number?: number
  loser_next_is_third_place?: boolean
  loser_next_match_position?: number
  is_third_place?: boolean
  bracket_type?: 'winners' | 'losers' | 'final' | 'grand_final'
  label?: string
  stage_round?: number
  template_key?: string
  next_template_key?: string
  loser_next_template_key?: string
}

export interface BracketMatchDetail {
  id: string
  bracket: 'winners' | 'losers' | 'final' | 'grand_final'
  round: number
  matchNumber: number
  stageRound: number
  name: string
  team1: string | null
  team1Id?: string | null
  team2: string | null
  team2Id?: string | null
  winner: string | null
  winnerId?: string | null
  loser: string | null
  loserId?: string | null
  isBye: boolean
  templateKey: string
  nextTemplateKey?: string
  nextMatchPosition?: number
  loserNextTemplateKey?: string
  loserNextMatchPosition?: number
}

export interface BracketRoundDetail {
  id: string
  name: string
  bracket: 'winners' | 'losers'
  stageRound: number
  matches: BracketMatchDetail[]
}

export interface DoubleEliminationSummary {
  winnersBracket: BracketRoundDetail[]
  losersBracket: BracketRoundDetail[]
  finals: BracketMatchDetail[]
  rankings: {
    champion: string | null
    runnerUp: string | null
    thirdPlace: string | null
  }
}

export interface MatchContext {
  bracket: 'winners' | 'losers' | 'final' | 'grand_final'
  round: number
  matchNumber: number
}

export interface DoubleEliminationOptions {
  randomize?: boolean
  determineWinner?: (
    teamA: string,
    teamB: string,
    context: MatchContext
  ) => string | null | undefined
}

function isDoubleEliminationOptions(
  value: unknown
): value is DoubleEliminationOptions {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  return (
    Object.prototype.hasOwnProperty.call(value, 'randomize') ||
    Object.prototype.hasOwnProperty.call(value, 'determineWinner')
  )
}

export interface BracketStructure {
  matches: Match[]
  rounds: number
  doubleElimination?: DoubleEliminationSummary
}

export function flattenDoubleEliminationTemplate(
  summary?: DoubleEliminationSummary | null
): Record<string, BracketMatchDetail> {
  const map: Record<string, BracketMatchDetail> = {}
  if (!summary) {
    return map
  }

  summary.winnersBracket.forEach(round => {
    round.matches.forEach(match => {
      map[match.templateKey] = match
    })
  })

  summary.losersBracket.forEach(round => {
    round.matches.forEach(match => {
      map[match.templateKey] = match
    })
  })

  summary.finals.forEach(match => {
    map[match.templateKey] = match
  })

  return map
}

/**
 * Shuffles an array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * Rounds up to next power of 2
 */
function nextPowerOf2(n: number): number {
  return Math.pow(2, Math.ceil(Math.log2(n)))
}

/**
 * Places teams in bracket positions using standard tournament seeding
 * Seed 1 at position 0, seed 2 at position bracketSize/2, etc.
 */
function placeSeededTeams(
  teams: TournamentTeam[],
  bracketSize: number
): (string | null)[] {
  const sortedTeams = [...teams].sort((a, b) => (a.seed || 0) - (b.seed || 0))
  const positions: (string | null)[] = new Array(bracketSize).fill(null)
  
  // Standard tournament bracket seeding algorithm
  // This ensures top seeds meet in later rounds
  function getSeedPosition(seed: number, bracketSize: number): number {
    if (seed === 1) return 0
    if (seed === 2) return bracketSize / 2
    
    // For other seeds, use recursive bracket placement
    // This creates the standard tournament bracket structure
    let pos = 0
    let currentSize = bracketSize
    let currentSeed = seed
    
    while (currentSize > 2) {
      const half = currentSize / 2
      if (currentSeed <= half) {
        // Stay in first half
        currentSize = half
      } else {
        // Move to second half
        pos += half
        currentSeed -= half
        currentSize = half
      }
    }
    
    return pos
  }
  
  sortedTeams.forEach((team, index) => {
    const seed = team.seed || (index + 1)
    const position = getSeedPosition(seed, bracketSize)
    positions[position] = team.id
  })
  
  return positions
}

/**
 * Generates single elimination bracket with smart bye handling
 */
export function generateSingleEliminationBracket(
  teams: TournamentTeam[],
  randomize: boolean = false
): BracketStructure {
  if (teams.length < 2) {
    return { matches: [], rounds: 0 }
  }

  // Step 1: Determine bracket size (next power of 2)
  const numTeams = teams.length
  const bracketSize = nextPowerOf2(numTeams)
  const numByes = bracketSize - numTeams
  const rounds = Math.log2(bracketSize)

  // Step 2: Prepare team list
  let teamList = randomize ? shuffleArray(teams) : [...teams]
  
  // Sort by seed if not randomizing and seeds are available
  if (!randomize && teamList.every(t => t.seed !== undefined)) {
    teamList.sort((a, b) => (a.seed || 0) - (b.seed || 0))
  }

  // Step 3: Create bracket positions array
  const bracketPositions: (string | null)[] = new Array(bracketSize).fill(null)

  if (!randomize && teamList.every(t => t.seed !== undefined)) {
    // Use seeded placement
    const seeded = placeSeededTeams(teamList, bracketSize)
    bracketPositions.splice(0, bracketSize, ...seeded)
  } else {
    // Random or unseeded: place teams first, then distribute byes
    teamList.forEach((team, index) => {
      bracketPositions[index] = team.id
    })
    
    // If randomizing, shuffle the positions (teams + byes)
    if (randomize) {
      // Create array with teams and nulls for byes
      const withByes: (string | null)[] = []
      teamList.forEach(team => withByes.push(team.id))
      for (let i = 0; i < numByes; i++) {
        withByes.push(null)
      }
      // Shuffle everything together
      const shuffled = shuffleArray(withByes)
      shuffled.forEach((teamId, index) => {
        bracketPositions[index] = teamId
      })
    } else {
      // Unseeded: byes go at the end
      // Teams are already placed, byes remain as null
    }
  }

  // Step 4: Create first round matches
  const matches: Match[] = []
  const firstRoundMatches = bracketSize / 2

  for (let i = 0; i < firstRoundMatches; i++) {
    const team1 = bracketPositions[i * 2]
    const team2 = bracketPositions[i * 2 + 1]
    const isBye = team1 === null || team2 === null
    // Winner of bye match is the team (not the null)
    const byeWinner = isBye ? (team1 || team2) : null

    matches.push({
      round: 1,
      match_number: i + 1,
      team1_id: team1,
      team2_id: team2,
      is_bye: isBye,
      winner_id: byeWinner,
      is_third_place: false,
      bracket_type: 'winners',
      label: `Winners Round 1 - Match ${i + 1}`,
    })
  }

  // Step 5: Generate subsequent rounds
  let currentRoundMatches = firstRoundMatches
  let currentRound = 1

  while (currentRoundMatches > 1) {
    currentRound++
    const nextRoundMatches = currentRoundMatches / 2
    const currentRoundStartIndex = matches.length - currentRoundMatches

    for (let i = 0; i < nextRoundMatches; i++) {
      matches.push({
        round: currentRound,
        match_number: i + 1,
        team1_id: null,
        team2_id: null,
        is_bye: false,
        is_third_place: false,
        bracket_type: 'winners',
        label: `Winners Round ${currentRound} - Match ${i + 1}`,
      })

      // Link previous round matches to this new match
      const prevMatch1Index = currentRoundStartIndex + i * 2
      const prevMatch2Index = prevMatch1Index + 1

      if (prevMatch1Index >= 0 && prevMatch1Index < matches.length - 1) {
        matches[prevMatch1Index].next_round = currentRound
        matches[prevMatch1Index].next_match_number = i + 1
        matches[prevMatch1Index].next_is_third_place = false
        matches[prevMatch1Index].next_match_position = 1
      }
      if (prevMatch2Index >= 0 && prevMatch2Index < matches.length - 1) {
        matches[prevMatch2Index].next_round = currentRound
        matches[prevMatch2Index].next_match_number = i + 1
        matches[prevMatch2Index].next_is_third_place = false
        matches[prevMatch2Index].next_match_position = 2
      }
    }

    currentRoundMatches = nextRoundMatches
  }

  // Step 6: Add third-place match (if at least semifinals exist)
  if (rounds >= 2) {
    const thirdPlaceMatchNumber = matches.filter(m => m.round === rounds).length + 1
    matches.push({
      round: rounds,
      match_number: thirdPlaceMatchNumber,
      team1_id: null,
      team2_id: null,
      is_bye: false,
      is_third_place: true,
      bracket_type: 'final',
      label: 'Third Place Match',
    })

    const thirdPlaceRefRound = rounds
    const thirdPlaceRefMatchNumber = thirdPlaceMatchNumber

    const semiFinalMatches = matches
      .filter(m => m.round === rounds - 1)
      .sort((a, b) => (a.match_number || 0) - (b.match_number || 0))

    if (semiFinalMatches.length >= 2) {
      semiFinalMatches[0].loser_next_round = thirdPlaceRefRound
      semiFinalMatches[0].loser_next_match_number = thirdPlaceRefMatchNumber
      semiFinalMatches[0].loser_next_is_third_place = true
      semiFinalMatches[0].loser_next_match_position = 1

      semiFinalMatches[1].loser_next_round = thirdPlaceRefRound
      semiFinalMatches[1].loser_next_match_number = thirdPlaceRefMatchNumber
      semiFinalMatches[1].loser_next_is_third_place = true
      semiFinalMatches[1].loser_next_match_position = 2
    }
  }

  return { matches, rounds: currentRound }
}

/**
 * Generates double elimination bracket
 * Handles winners bracket, losers bracket, finals, and grand final logic
 */
export function generateDoubleEliminationBracket(
  teams: (TournamentTeam | string)[],
  randomizeOrOptions: boolean | DoubleEliminationOptions = false
): BracketStructure {
  const options: DoubleEliminationOptions = isDoubleEliminationOptions(
    randomizeOrOptions
  )
    ? randomizeOrOptions
    : { randomize: Boolean(randomizeOrOptions) }

  const randomize = options.randomize ?? false
  const determineWinner = options.determineWinner

  type TeamState = {
    id: string
    name: string
    losses: number
    isBye?: boolean
    sourceTemplateKey?: string
    originType?: 'winner' | 'loser'
  }

  if (!teams || teams.length === 0) {
    return {
      matches: [],
      rounds: 0,
      doubleElimination: {
        winnersBracket: [],
        losersBracket: [],
        finals: [],
        rankings: {
          champion: null,
          runnerUp: null,
          thirdPlace: null,
        },
      },
    }
  }

  const normalizedTeams: TeamState[] = teams.map((team, index) => {
    if (typeof team === 'string') {
      return {
        id: `team_${index + 1}`,
        name: team,
        losses: 0,
      }
    }

    return {
      id: team.id || `team_${index + 1}`,
      name: team.name,
      losses: 0,
    }
  })

  let workingTeams = randomize ? shuffleArray(normalizedTeams) : [...normalizedTeams]

  const numTeams = workingTeams.length
  if (numTeams === 1) {
    return {
      matches: [],
      rounds: 0,
      doubleElimination: {
        winnersBracket: [],
        losersBracket: [],
        finals: [],
        rankings: {
          champion: workingTeams[0].name,
          runnerUp: null,
          thirdPlace: null,
        },
      },
    }
  }

  const bracketSize = nextPowerOf2(numTeams)
  const byesNeeded = Math.max(0, bracketSize - numTeams)
  let byeCounter = 0

  const createByeTeam = (): TeamState => ({
    id: `bye_${++byeCounter}`,
    name: 'BYE',
    losses: 2,
    isBye: true,
  })

  for (let i = 0; i < byesNeeded; i++) {
    workingTeams.push(createByeTeam())
  }

  if (randomize && byesNeeded > 0) {
    workingTeams = shuffleArray(workingTeams)
  }

  const winnersBracketRounds: BracketRoundDetail[] = []
  const losersBracketRounds: BracketRoundDetail[] = []
  const finalsMatches: BracketMatchDetail[] = []
  const losersEliminationOrder: TeamState[] = []
  const matchRegistry = new Map<string, BracketMatchDetail>()

  let winnersRoundTeams: TeamState[] = [...workingTeams]
  let losersRoundTeams: TeamState[] = []
  let winnersRoundNumber = 1
  let losersRoundNumber = 1

  const resolveWinner = (
    teamA: TeamState,
    teamB: TeamState,
    context: MatchContext
  ): TeamState => {
    if (teamA.isBye) return teamB
    if (teamB.isBye) return teamA

    if (determineWinner) {
      try {
        const desiredWinner = determineWinner(teamA.name, teamB.name, context)
        if (desiredWinner === teamA.name) return teamA
        if (desiredWinner === teamB.name) return teamB
      } catch {
        // Ignore callback errors and fall back to randomized resolution
      }
    }

    return Math.random() < 0.5 ? teamA : teamB
  }

  const playRound = (
    teamsInRound: TeamState[],
    bracket: 'winners' | 'losers' | 'final' | 'grand_final',
    roundNumber: number,
    label: string,
    idPrefix: string
  ) => {
    const pairings: TeamState[] = [...teamsInRound]
    if (pairings.length === 0) {
      return {
        matches: [] as BracketMatchDetail[],
        winners: [] as TeamState[],
        sentToLosers: [] as TeamState[],
        eliminated: [] as TeamState[],
      }
    }

    if (pairings.length === 1) {
      pairings.push(createByeTeam())
    } else if (pairings.length % 2 !== 0) {
      pairings.push(createByeTeam())
    }

    const matches: BracketMatchDetail[] = []
    const advancing: TeamState[] = []
    const sentToLosers: TeamState[] = []
    const eliminated: TeamState[] = []

    let matchNumber = 0
    for (let index = 0; index < pairings.length; index += 2) {
      const team1 = pairings[index]
      const team2 = pairings[index + 1]
      if (!team1 || !team2) {
        continue
      }

      if (team1.isBye && team2.isBye) {
        continue
      }

      matchNumber += 1

      const context: MatchContext = {
        bracket,
        round: roundNumber,
        matchNumber,
      }

      let winner: TeamState | null = null
      let loser: TeamState | null = null
      let isBye = false

      if (team1.isBye) {
        winner = { ...team2 }
        isBye = true
      } else if (team2.isBye) {
        winner = { ...team1 }
        isBye = true
      } else {
        const resolvedWinner = resolveWinner(team1, team2, context)
        const resolvedLoser = resolvedWinner.id === team1.id ? team2 : team1
        winner = { ...resolvedWinner }
        loser = { ...resolvedLoser }
      }

      if (loser && !loser.isBye) {
        const loserLosses = loser.losses + 1
        loser = {
          ...loser,
          losses: loserLosses,
          sourceTemplateKey: `${idPrefix}-M${matchNumber}`,
          originType: 'loser',
        }

        if (bracket === 'winners') {
          sentToLosers.push(loser)
        } else if (bracket === 'losers') {
          if (loserLosses >= 2) {
            eliminated.push(loser)
          }
        }
      }

      let winnerState: TeamState | null = null
      if (winner && !winner.isBye) {
        winnerState = {
          ...winner,
          sourceTemplateKey: `${idPrefix}-M${matchNumber}`,
          originType: 'winner',
        }
        advancing.push(winnerState)
      }

      const templateKey = `${idPrefix}-M${matchNumber}`
      const matchDetail: BracketMatchDetail = {
        id: templateKey,
        templateKey,
        bracket,
        round: roundNumber,
        stageRound: roundNumber,
        matchNumber,
        name: `${label} - Match ${matchNumber}`,
        team1: team1.isBye ? null : team1.name,
        team1Id: team1.isBye ? null : team1.id,
        team2: team2.isBye ? null : team2.name,
        team2Id: team2.isBye ? null : team2.id,
        winner: winnerState ? winnerState.name : winner ? winner.name : null,
        winnerId: winnerState ? winnerState.id : winner ? winner.id : null,
        loser: loser && !loser.isBye ? loser.name : null,
        loserId: loser && !loser.isBye ? loser.id : null,
        isBye,
      }

      matchRegistry.set(templateKey, matchDetail)

      ;[
        { team: team1, position: 1 },
        { team: team2, position: 2 },
      ].forEach(({ team, position }) => {
        const sourceKey = team.sourceTemplateKey
        if (!sourceKey || !team.originType) {
          return
        }
        const sourceMatch = matchRegistry.get(sourceKey)
        if (!sourceMatch) {
          return
        }
        if (team.originType === 'winner') {
          sourceMatch.nextTemplateKey = templateKey
          sourceMatch.nextMatchPosition = position
        } else if (team.originType === 'loser') {
          sourceMatch.loserNextTemplateKey = templateKey
          sourceMatch.loserNextMatchPosition = position
        }
      })

      matches.push(matchDetail)
    }

    return {
      matches,
      winners: advancing,
      sentToLosers,
      eliminated,
    }
  }

  while (winnersRoundTeams.filter(team => !team.isBye).length > 1) {
    const winnersRoundResult = playRound(
      winnersRoundTeams,
      'winners',
      winnersRoundNumber,
      `Winners Round ${winnersRoundNumber}`,
      `WB-R${winnersRoundNumber}`
    )

    winnersBracketRounds.push({
      id: `WB-R${winnersRoundNumber}`,
      name: `Winners Round ${winnersRoundNumber}`,
      bracket: 'winners',
      stageRound: winnersRoundNumber,
      matches: winnersRoundResult.matches,
    })

    winnersRoundTeams = winnersRoundResult.winners

    // Stage 1: existing losers bracket survivors play
    if (losersRoundTeams.filter(team => !team.isBye).length > 0) {
      const losersFirstStage = playRound(
        losersRoundTeams,
        'losers',
        losersRoundNumber,
        `Losers Round ${losersRoundNumber}`,
        `LB-R${losersRoundNumber}`
      )

      if (losersFirstStage.matches.length > 0) {
        losersBracketRounds.push({
          id: `LB-R${losersRoundNumber}`,
          name: `Losers Round ${losersRoundNumber}`,
          bracket: 'losers',
          stageRound: losersRoundNumber,
          matches: losersFirstStage.matches,
        })
        losersEliminationOrder.push(...losersFirstStage.eliminated)
        losersRoundTeams = losersFirstStage.winners
        losersRoundNumber += 1
      } else {
        // No matches played, keep teams for next stage without incrementing round
        losersRoundTeams = losersFirstStage.winners
      }
    }

    const combinedLosers = [...losersRoundTeams, ...winnersRoundResult.sentToLosers]

    if (combinedLosers.filter(team => !team.isBye).length > 0) {
      const losersSecondStage = playRound(
        combinedLosers,
        'losers',
        losersRoundNumber,
        `Losers Round ${losersRoundNumber}`,
        `LB-R${losersRoundNumber}`
      )

      if (losersSecondStage.matches.length > 0) {
        losersBracketRounds.push({
          id: `LB-R${losersRoundNumber}`,
          name: `Losers Round ${losersRoundNumber}`,
          bracket: 'losers',
          stageRound: losersRoundNumber,
          matches: losersSecondStage.matches,
        })
        losersEliminationOrder.push(...losersSecondStage.eliminated)
        losersRoundTeams = losersSecondStage.winners
        losersRoundNumber += 1
      } else {
        losersRoundTeams = losersSecondStage.winners
      }
    }

    winnersRoundNumber += 1
  }

  const winnersChampion = winnersRoundTeams.find(team => !team.isBye) || null
  const losersChampion = losersRoundTeams.find(team => !team.isBye) || null

  let championName: string | null = null
  let runnerUpName: string | null = null

  if (winnersChampion && losersChampion) {
    const finalResult = playRound(
      [winnersChampion, losersChampion],
      'final',
      1,
      'Final',
      'FINAL'
    )

    if (finalResult.matches.length > 0) {
      finalResult.matches[0].stageRound = 1
      finalsMatches.push(finalResult.matches[0])
    }

    const finalWinner = finalResult.winners[0] || null
    const finalLoser =
      finalWinner && finalWinner.id === winnersChampion.id
        ? losersChampion
        : winnersChampion

    // If losers bracket winner wins the finals, schedule a grand final rematch
    if (finalWinner && finalWinner.id === losersChampion.id) {
      const grandFinalResult = playRound(
        [finalWinner, finalLoser],
        'grand_final',
        1,
        'Grand Final',
        'GRAND-FINAL'
      )

      if (grandFinalResult.matches.length > 0) {
        grandFinalResult.matches[0].stageRound = 2
        finalsMatches.push(grandFinalResult.matches[0])
      }

      const grandWinner = grandFinalResult.winners[0] || null
      const grandLoser =
        grandWinner && grandWinner.id === finalWinner.id ? finalLoser : finalWinner

      championName = grandWinner ? grandWinner.name : finalWinner.name
      runnerUpName = grandLoser ? grandLoser.name : finalLoser.name
    } else {
      championName = finalWinner ? finalWinner.name : winnersChampion.name
      runnerUpName = finalLoser ? finalLoser.name : losersChampion.name
    }
  } else if (winnersChampion) {
    championName = winnersChampion.name
    runnerUpName = losersEliminationOrder.length
      ? losersEliminationOrder[losersEliminationOrder.length - 1].name
      : null
  }

  const thirdPlace =
    losersEliminationOrder.length > 0
      ? losersEliminationOrder[losersEliminationOrder.length - 1].name
      : null

  const aggregateMatches: Match[] = []
  let sequentialRound = 0

  const appendMatches = (
    rounds: BracketRoundDetail[],
    stage: 'winners' | 'losers'
  ) => {
    rounds.forEach(round => {
      if (round.matches.length === 0) {
        return
      }
      sequentialRound += 1
      round.matches.forEach((match, index) => {
        aggregateMatches.push({
          round: sequentialRound,
          match_number: index + 1,
          team1_id: match.team1Id ?? null,
          team2_id: match.team2Id ?? null,
          winner_id: match.winnerId ?? null,
          is_bye: match.isBye,
          is_third_place: false,
          bracket_type: stage,
          stage_round: match.stageRound ?? sequentialRound,
          label: match.name,
          template_key: match.templateKey,
          next_template_key: match.nextTemplateKey,
          loser_next_template_key: match.loserNextTemplateKey,
        })
      })
    })
  }

  appendMatches(winnersBracketRounds, 'winners')
  appendMatches(losersBracketRounds, 'losers')
  finalsMatches.forEach(match => {
    sequentialRound += 1
    aggregateMatches.push({
      round: sequentialRound,
      match_number: 1,
      team1_id: match.team1Id ?? null,
      team2_id: match.team2Id ?? null,
      winner_id: match.winnerId ?? null,
      is_bye: match.isBye,
      is_third_place: false,
      bracket_type: match.bracket,
      stage_round: match.stageRound ?? 1,
      label: match.name,
      template_key: match.templateKey,
      next_template_key: match.nextTemplateKey,
      loser_next_template_key: match.loserNextTemplateKey,
    })
  })

  return {
    matches: aggregateMatches,
    rounds: winnersBracketRounds.length,
    doubleElimination: {
      winnersBracket: winnersBracketRounds,
      losersBracket: losersBracketRounds,
      finals: finalsMatches,
      rankings: {
        champion: championName,
        runnerUp: runnerUpName,
        thirdPlace,
      },
    },
  }
}

/**
 * Generates round robin bracket
 * Each team plays every other team once
 */
export function generateRoundRobinBracket(
  teams: TournamentTeam[],
  randomize: boolean = false
): BracketStructure {
  if (teams.length < 2) {
    return { matches: [], rounds: 0 }
  }

  let teamList = randomize ? shuffleArray(teams) : [...teams]
  const matches: Match[] = []
  let matchNumber = 1

  // Round robin: each team plays every other team
  for (let i = 0; i < teamList.length; i++) {
    for (let j = i + 1; j < teamList.length; j++) {
      matches.push({
        round: 1, // All matches in round 1 for round robin
        match_number: matchNumber++,
        team1_id: teamList[i].id,
        team2_id: teamList[j].id,
        is_bye: false,
      })
    }
  }

  return { matches, rounds: 1 }
}

/**
 * Main function to generate bracket based on type
 */
export function generateBracket(
  teams: TournamentTeam[],
  bracketType: BracketType,
  randomize: boolean = false
): BracketStructure {
  switch (bracketType) {
    case 'single_elimination':
      return generateSingleEliminationBracket(teams, randomize)
    case 'double_elimination':
      return generateDoubleEliminationBracket(teams, randomize)
    case 'round_robin':
      return generateRoundRobinBracket(teams, randomize)
    default:
      return { matches: [], rounds: 0 }
  }
}

