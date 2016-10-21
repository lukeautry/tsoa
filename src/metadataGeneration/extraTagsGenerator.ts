import { Type, Parameter } from './metadataGenerator';
import * as ts from 'typescript';
import * as tsserver from '../tsserver';


export interface Method {
    description: string;
    example: any;
    method: string;
    name: string;
    parameters: Parameter[];
    path: string;
    type: Type;
    tags?: string[];
}

export class ExtraTagsGenerator {

    public static getTags(node: tsserver.Node): string[]{
        let tags: string[] = [];
        node.jsDocComments && node.jsDocComments.forEach((comment: ts.JSDoc)=> {
            if(comment.tags){
                comment.tags.forEach((tag: ts.JSDocTag)=>{
                    tags = ExtraTagsGenerator.processTag(tag);
                });
            }
        });
        return tags;
    }

    private static processTag(tag: ts.JSDocTag): string[]{
        let tags: string[] = [];
        if(tag && tag.tagName.text == "tags"){
            switch(tag.tagName.text){
                case "tags":
                    tags = tags.concat(new Function(`return ${tag.comment};`)());
                    break;
            }
        }
        return tags;
    }

}

export function ExtraTags(target: Object, propertyKey: string, descriptor: TypedPropertyDescriptor<any>): TypedPropertyDescriptor<any>{
    let originalMethod = descriptor.value;
    descriptor.value = function(...args: any[]){
        let result = originalMethod.apply(this, args);
        // here we should add our extra tags
        result.tags = ExtraTagsGenerator.getTags(this.node);
        return result;
    };
    return descriptor;
}

export function ExtraMethodProperty(target: Object, propertyKey: string, descriptor: TypedPropertyDescriptor<any>): TypedPropertyDescriptor<any>{
    let originalMethod = descriptor.value;
    descriptor.value = function(...args: any[]){
        let result = originalMethod.apply(this, args);
        // here we should add our extra properties for swagger.json
        let method = args[0], pathObject = args[1];
        let pathMethod = pathObject[method.method];
        if(method.tags && method.tags.length){
            pathMethod.tags = method.tags;
        }
        return result;
    }
    return descriptor;
}