/* eslint-disable @typescript-eslint/no-unused-vars */
interface Status {
    id: string
    name: string
}

interface Action {
    name: string
    id: string
    to: {
        id: string
        name: string
    }
}

interface Actions {
    [actionId: string]: Action
}

interface Workflow {
    [actionId: string]: Action[]
}
