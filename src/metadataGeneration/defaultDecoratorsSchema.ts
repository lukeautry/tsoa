import {
    DecoratorsSchema, CustomParameterDecorator, CustomMethodDecorator,
    CustomControllerDecorator
} from './acceptedDecoratorsSchema';
export const DEFAULT_DECORATORS_SCHEMA: DecoratorsSchema = {
    controllersDecorators: <CustomControllerDecorator[]>[
        {
            name: "Route",
            tsoaDecorator: "Route"
        },
        {
            name: "Controller",
            tsoaDecorator: "Route"
        },
        {
            name: "JsonController",
            tsoaDecorator: "Route"
        }
    ],
    methodDecorators: <CustomMethodDecorator[]>[
        {
            name: "get",
            tsoaDecorator: "get"
        },
        {
            name: "post",
            tsoaDecorator: "post"
        },
        {
            name: "patch",
            tsoaDecorator: "patch"
        },
        {
            name: "delete",
            tsoaDecorator: "delete"
        },
        {
            name: "put",
            tsoaDecorator: "put"
        }

    ],

    parameterDecorators: <CustomParameterDecorator[]>[
        {
            name: "Request",
            tsoaDecorator: "Request"
        },
        {
            name: "Body",
            tsoaDecorator: "Body"
        },
        {
            name: "BodyProp",
            tsoaDecorator: "BodyProp"
        },
        {
            name: "Header",
            tsoaDecorator: "Header"
        },
        {
            name: "Query",
            tsoaDecorator: "Query"
        },
        {
            name: "Path",
            tsoaDecorator: "Path"
        }

    ]
};