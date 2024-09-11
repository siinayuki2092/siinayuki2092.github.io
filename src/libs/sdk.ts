import { AQUA_HOST, DATA_HOST } from './config'
import type {
  AllMusic,
  Card,
  CardSummary,
  GenericGameSummary,
  GenericRanking,
  TrendEntry,
  AquaNetUser, GameOption,
  UserBox,
  ChangeUserBoxReq,
  UserBoxItemKind
} from './generalTypes'
import type { GameName } from './scoring'

interface RequestInitWithParams extends RequestInit {
  params?: { [index: string]: string }
  localCache?: boolean
}

/**
 * Modify a fetch url
 *
 * @param input Fetch url input
 * @param callback Callback for modification
 */
export function reconstructUrl(input: URL | RequestInfo, callback: (url: URL) => URL | void): RequestInfo | URL {
  let u = new URL((input instanceof Request) ? input.url : input)
  const result = callback(u)
  if (result) u = result
  if (input instanceof Request) {
    // @ts-ignore
    return { url: u, ...input }
  }
  return u
}

/**
 * Fetch with url parameters
 */
export function fetchWithParams(input: URL | RequestInfo, init?: RequestInitWithParams): Promise<Response> {
  return fetch(reconstructUrl(input, u => {
    u.search = new URLSearchParams(init?.params ?? {}).toString()
  }), init)
}

const cache: { [index: string]: any } = {}

export async function post(endpoint: string, params: Record<string, any> = {}, init?: RequestInitWithParams): Promise<any> {
  // Add token if exists
  const token = localStorage.getItem('token')
  if (token && !('token' in params)) params = { ...(params ?? {}), token }

  if (init?.localCache) {
    const cached = cache[endpoint + JSON.stringify(params) + JSON.stringify(init)]
    if (cached) return cached
  }

  const res = await fetchWithParams(AQUA_HOST + endpoint, {
    method: 'POST',
    params,
    ...init
  }).catch(e => {
    console.error(e)
    throw new Error('Network error')
  })

  if (!res.ok) {
    const text = await res.text()
    console.error(`${res.status}: ${text}`)

    // If 400 invalid token is caught, should invalidate the token and redirect to signin
    if (text === 'Invalid token') {
      localStorage.removeItem('token')
      window.location.href = '/'
    }

    // Try to parse as json
    let json
    try {
      json = JSON.parse(text)
    } catch (e) {
      throw new Error(text)
    }
    if (json.error) throw new Error(json.error)
  }

  const ret = res.json()
  cache[endpoint + JSON.stringify(params) + JSON.stringify(init)] = ret

  return ret
}

export async function get(endpoint: string, params:any,init?: RequestInitWithParams): Promise<any> {
  // Add token if exists
  const token = localStorage.getItem('token')

  if (init?.localCache) {
    const cached = cache[endpoint + JSON.stringify(init)]
    if (cached) return cached
  }

  const res = await fetchWithParams(AQUA_HOST + endpoint, {
    method: 'GET',
    params,
    ...init
  }).catch(e => {
    console.error(e)
    throw new Error('Network error')
  })

  if (!res.ok) {
    const text = await res.text()
    console.error(`${res.status}: ${text}`)

    // If 400 invalid token is caught, should invalidate the token and redirect to signin
    if (text === 'Invalid token') {
      localStorage.removeItem('token')
      window.location.href = '/'
    }

    // Try to parse as json
    let json
    try {
      json = JSON.parse(text)
    } catch (e) {
      throw new Error(text)
    }
    if (json.error) throw new Error(json.error)
  }

  const ret = res.json()
  cache[endpoint + JSON.stringify(init)] = ret

  return ret
}

export async function put(endpoint: string, params: any, init?: RequestInitWithParams): Promise<any> {
  // Add token if exists
  const token = localStorage.getItem('token')
  if (token && !('token' in params)) params = { ...(params ?? {}), token }

  if (init?.localCache) {
    const cached = cache[endpoint + JSON.stringify(params) + JSON.stringify(init)]
    if (cached) return cached
  }

  const res = await fetchWithParams(AQUA_HOST + endpoint, {
    method: 'PUT',
    body: JSON.stringify(params),
    headers:{
      'Content-Type':'application/json',
      ...init?.headers
    },
    ...init
  }).catch(e => {
    console.error(e)
    throw new Error('Network error')
  })

  if (!res.ok) {
    const text = await res.text()
    console.error(`${res.status}: ${text}`)

    // If 400 invalid token is caught, should invalidate the token and redirect to signin
    if (text === 'Invalid token') {
      localStorage.removeItem('token')
      window.location.href = '/'
    }

    // Try to parse as json
    let json
    try {
      json = JSON.parse(text)
    } catch (e) {
      throw new Error(text)
    }
    if (json.error) throw new Error(json.error)
  }

  const ret = res.json()
  cache[endpoint + JSON.stringify(params) + JSON.stringify(init)] = ret

  return ret
}

export async function realPost(endpoint: string, params: any, init?: RequestInitWithParams): Promise<any> {
  const res = await fetchWithParams(AQUA_HOST + endpoint, {
    method: 'POST',
    body: JSON.stringify(params),
    headers:{
      'Content-Type':'application/json',
      ...init?.headers
    },
    ...init
  }).catch(e => {
    console.error(e)
    throw new Error('Network error')
  })

  if (!res.ok) {
    const text = await res.text()
    console.error(`${res.status}: ${text}`)

    // If 400 invalid token is caught, should invalidate the token and redirect to signin
    if (text === 'Invalid token') {
      localStorage.removeItem('token')
      window.location.href = '/'
    }

    // Try to parse as json
    let json
    try {
      json = JSON.parse(text)
    } catch (e) {
      throw new Error(text)
    }
    if (json.error) throw new Error(json.error)
  }

  return res.json()
}

/**
 * aqua.net.UserRegistrar
 *
 * @param user
 */
async function register(user: { username: string, email: string, password: string, turnstile: string }) {
  return await post('/api/v2/user/register', user)
}
async function login(user: { email: string, password: string, turnstile: string }) {
  const data = await post('/api/v2/user/login', user)

  // Put token into local storage
  localStorage.setItem('token', data.token)
}

const isLoggedIn = () => !!localStorage.getItem('token')
const ensureLoggedIn = () => !isLoggedIn() && (window.location.href = '/')

export const USER = {
  register,
  login,
  confirmEmail: (token: string) =>
    post('/api/v2/user/confirm-email', { token }),
  me: (): Promise<AquaNetUser> => {
    ensureLoggedIn()
    return post('/api/v2/user/me', {})
  },
  keychip: (): Promise<string> =>
    post('/api/v2/user/keychip', {}).then(it => it.keychip),
  setting: (key: string, value: string) =>
    post('/api/v2/user/setting', { key: key === 'password' ? 'pwHash' : key, value }),
  uploadPfp: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return post('/api/v2/user/upload-pfp', { }, { method: 'POST', body: formData })
  },
  isLoggedIn,
  ensureLoggedIn,
}

export const USERBOX = {
  getAimeId:(cardId:string):Promise<{luid:string}|null> =>realPost('/api/sega/aime/getByAccessCode',{ accessCode:cardId }),
  getProfile:(aimeId:string):Promise<UserBox> =>get('/api/game/chuni/v2/profile',{ aimeId }),
  getUnlockedItems:(aimeId:string, itemId: UserBoxItemKind):Promise<{itemKind:number, itemId:number,stock:number,isValid:boolean}[]> =>
    get(`/api/game/chuni/v2/item/${itemId}`,{ aimeId }),
  getItemLabels:() => {
    const kinds = [ 'nameplate', 'frame', 'trophy', 'mapicon', 'sysvoice', 'avatar' ]

    return Promise.all(kinds.map(it =>
      get(`/api/game/chuni/v2/data/${it}`,{}).then((res:{id:number,name:string}[]) =>
        // Use the id as the key
        res.reduce((acc, cur) => ({ ...acc, [cur.id]: cur.name }), {}) as { [index: number]: string }
      ))).then(([ nameplate, frame, trophy, mapicon, sysvoice, avatar ]) => ({
      nameplate, frame, trophy, mapicon, sysvoice, avatar
    }))
  },
  setUserBox:({ kind,...body }:ChangeUserBoxReq) =>
    put(`/api/game/chuni/v2/profile/${kind}`, body),
}

export const CARD = {
  summary: (cardId: string): Promise<{card: Card, summary: CardSummary}> =>
    post('/api/v2/card/summary', { cardId }),
  link: (props: { cardId: string, migrate: string }) =>
    post('/api/v2/card/link', props),
  unlink: (cardId: string) =>
    post('/api/v2/card/unlink', { cardId }),
  userGames: (username: string): Promise<CardSummary> =>
    post('/api/v2/card/user-games', { username }),
}

export const GAME = {
  trend: (username: string, game: GameName): Promise<TrendEntry[]> =>
    post(`/api/v2/game/${game}/trend`, { username }),
  userSummary: (username: string, game: GameName): Promise<GenericGameSummary> =>
    post(`/api/v2/game/${game}/user-summary`, { username }),
  ranking: (game: GameName): Promise<GenericRanking[]> =>
    post(`/api/v2/game/${game}/ranking`, { }),
  changeName: (game: GameName, newName: string): Promise<{ newName: string }> =>
    post(`/api/v2/game/${game}/change-name`, { newName }),
  export: (game: GameName): Promise<Record<string, any>> =>
    post(`/api/v2/game/${game}/export`),
  import: (game: GameName, data: any): Promise<Record<string, any>> =>
    post(`/api/v2/game/${game}/import`, {}, { body: JSON.stringify(data) }),
  setRival: (game: GameName, rivalUserName: string, isAdd: boolean) =>
    post(`/api/v2/game/${game}/set-rival`, { rivalUserName, isAdd }),
}

export const DATA = {
  allMusic: (game: GameName): Promise<AllMusic> =>
    fetch(`${DATA_HOST}/d/${game}/00/all-music.json`).then(it => it.json())
}

export const SETTING = {
  get: (): Promise<GameOption[]> =>
    post('/api/v2/settings/get', {}),
  set: (key: string, value: any) =>
    post('/api/v2/settings/set', { key, value: `${value}` }),
}
