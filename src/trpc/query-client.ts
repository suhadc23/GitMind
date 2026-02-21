import { QueryClient } from '@tanstack/react-query'
import superjson from 'superjson'

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
      },
      dehydrate: {
        serializeData: superjson.serialize,
        shouldDehydrateQuery: (query) =>
          query.state.status === 'success',
      },
      hydrate: {
        deserializeData: superjson.deserialize,
      },
    },
  })
