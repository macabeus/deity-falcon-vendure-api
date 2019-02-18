import {
    ApiDataSource,
    ApiUrlPriority,
    ContextFetchResponse,
    ContextRequestOptions,
    FetchUrlParams,
    FetchUrlResult,
    GraphQLContext,
} from '@deity/falcon-server-env';
import { ConfigurableContainerConstructorParams } from '@deity/falcon-server-env/src/models/ApiDataSource';
import { ConfigurableConstructorParams } from '@deity/falcon-server-env/src/types';
import { Request } from 'apollo-server-env';
import { DocumentNode, GraphQLResolveInfo, print } from 'graphql';

import { AddressInput } from './generated/falcon-types';
import { GetActiveOrder, GetCustomer } from './generated/vendure-types';

export interface VendureApiConfig {
    host: string;
    port: number;
    apiPath: string;
    protocol: 'http' | 'https';
}

export type VendureApiParams = ConfigurableContainerConstructorParams & ConfigurableConstructorParams<VendureApiConfig>;

export interface SessionData {
    cookieSession: string;
    cookieSessionSig: string;
    order?: GetActiveOrder.ActiveOrder;
    customer?: GetCustomer.ActiveCustomer;
    addressInput?: AddressInput;
    lastOrderCode?: string;
}

/**
 * The base class deals with the request/response housekeeping and session management whereas the VendureApiBase
 * contains the actual resolver methods.
 */
export class VendureApiBase extends ApiDataSource {

    constructor(private params: VendureApiParams) {
        super(params);
    }

    getFetchUrlPriority(url: string): number {
        return ApiUrlPriority.HIGH;
    }

    async fetchUrl(obj: object, args: FetchUrlParams, context: GraphQLContext, info: GraphQLResolveInfo): Promise<FetchUrlResult> {
        const { path } = args;
        const result: FetchUrlResult = {
            id: 0,
            path,
            type: `shop-category`,
        };
        if (path.indexOf('category/') === 0) {
            const matches = path.match(/category\/(\d+)/);
            if (matches) {
                result.id = matches[1];
                result.type = 'shop-category';
            }
        }
        if (path.indexOf('product/') === 0) {
            const matches = path.match(/product\/(\d+)/);
            if (matches) {
                result.id = matches[1];
                result.type = 'shop-product';
            }
        }
        return result;
    }

    /**
     * Make a GraphQL query via POST to the Vendure API.
     */
    protected async query<T, V extends { [key: string]: any; } = any>(query: DocumentNode, variables?: V): Promise<T> {
        const apiPath = this.params.config && this.params.config.apiPath;
        if (!apiPath) {
            throw new Error(`No apiPath defined in the Falcon config`);
        }
        try {
            const response = await this.post(apiPath, {
                    query: print(query),
                    variables,
                },
                {
                    context: {
                        isAuthRequired: true,
                    },
                });
            if (response.errors) {
                // tslint:disable-next-line:no-console
                console.log(JSON.stringify(response.errors[0], null, 2));
                throw new Error(response.errors[0].message);
            }
            return response.data;
        } catch (e) {
            // tslint:disable-next-line:no-console
            console.log(JSON.stringify(e, null, 2));
            const errorMessage = (e.extensions && e.extensions && e.extensions.response &&
                e.extensions.response.body && e.extensions.response.body.errors &&
                e.extensions.response.body.errors.map((err: any) => err.message).join(', ')) || e.message;
            throw new Error(JSON.stringify(errorMessage, null, 2));
        }
    }

    willSendRequest(request: ContextRequestOptions): Promise<void> {
        const session: SessionData = this.session;
        const sessionCookie = session.cookieSession;
        const sigCookie = session.cookieSessionSig;
        if (sessionCookie && sigCookie) {
            request.headers.set('Cookie', `${sessionCookie}; ${sigCookie}`);
        }
        return super.willSendRequest(request);
    }

    async didReceiveResponse<TResult = any>(res: ContextFetchResponse, req: Request): Promise<TResult> {
        // TODO: implement handling for bearer-token-based auth
        const cookies = (res.headers.get('set-cookie') || '').split(/[,;]\s*/);
        const data = await super.didReceiveResponse(res, req);
        const session: SessionData = this.session;

        for (const part of cookies) {
            if (/^session=/.test(part)) {
                session.cookieSession = part;
            }
            if (/^session.sig=/.test(part)) {
                session.cookieSessionSig = part;
            }
        }
        return data;
    }
}
