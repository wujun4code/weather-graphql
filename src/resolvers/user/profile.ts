import { withAuthentication } from '../../decorators/index.js';
export const resolvers = {
    Query: {
        publicProfile: async (parent, args, context, info) => {
            return await context.dataSources.user.getSharedPublicProfile(context, args.input);
        },
        userProfile: withAuthentication(async (parent, args, context, info) => {
            const {
                session: { user }
            } = context;
            return await context.dataSources.user.getMyProfileByUserId(context, { userId: parseInt(user.id) });
        }),
    },
    PrivateProfileInfo: {
        oauth2BindingsConnection: withAuthentication(async (parent, args, context, info) => {
            const { oauth2Bindings, _count } = await context.dataSources.user.getOAuth2Bindings(context, {
                ...args.filers,
                userId: parseInt(parent.id)
            });

            const result = {
                edges: oauth2Bindings.map(n => {
                    return { cursor: n.updatedAt, node: n };
                }),
                pageInfo: {
                    hasNextPage: false,
                    endCursor: oauth2Bindings.length > 0 ? oauth2Bindings[oauth2Bindings.length - 1].updatedAt : ''
                },
                totalCount: _count.oauth2Bindings
            };

            return result;
        }),
    }
};