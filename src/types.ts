export type Props = Record<string, unknown> & {
  children: ReactElement[] | TextElement[]
}

export type ReactElement = {
  type: string
  props: Props
}

export type TextElement = ReactElement & {
  type: 'TEXT_ELEMENT'
  props: {
    nodeValue: string
    children: string | ReactElement[] | TextElement[]
  }
}

export type Fiber = {
  type: string
  dom: Node | null
  props: Props
  parent: Fiber | null
  sibling: Fiber | null
  child: Fiber | null
  alternate: Fiber | null
  effectTag?: 'UPDATE' | 'PLACEMENT' | 'DELETION'
}
