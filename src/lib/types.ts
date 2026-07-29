export interface Household {
  id: string
  name: string
  invite_code: string
}

export interface Profile {
  id: string
  household_id: string | null
  display_name: string
}

export interface Store {
  id: string
  household_id: string
  name: string
  position: string
}

export interface Section {
  id: string
  household_id: string
  store_id: string
  name: string
  position: string
}

export interface ListItem {
  id: string
  household_id: string
  store_id: string
  section_id: string | null
  name: string
  quantity: number
  checked: boolean
  position: string
}
