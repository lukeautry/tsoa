import {Controller} from './routing/controller';
import {Example} from './decorators/example';
import {Generator as SwaggerGenerator} from './swagger/generator';
import {Method} from './routing/method';
import {Post, Get, Patch, Delete, Put} from './decorators/methods';
import {RegisterExpressRoutes} from './adapters/express';
import {Route} from './decorators/route';

export {
    Controller,
    Delete,
    Example,
    Get,
    Method,
    Patch,
    Post,
    Put,
    RegisterExpressRoutes,
    Route,
    SwaggerGenerator
}
