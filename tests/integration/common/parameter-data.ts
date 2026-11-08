import { expect } from 'chai';
import 'mocha';
import { App } from 'supertest/types';
import { Gender, GenericModel, GenericRequest, ParameterTestModel, TestModel } from '../../fixtures/testModel';
import { getFakeModel } from './fake-models';
import { verifyRequest, verifyGetRequest, verifyPostRequest } from '../utils';

export function registerParameterDataTests(app: App, basePath: string) {
  describe('Parameter data', () => {
    it('parses query parameters', () => {
      return verifyGetRequest(app, basePath + '/ParameterTest/Query?firstname=Tony&last_name=Stark&age=45&weight=82.1&human=true&gender=MALE&nicknames=Ironman&nicknames=Iron Man', (_err, res) => {
        const model = res.body as ParameterTestModel;
        expect(model.firstname).to.equal('Tony');
        expect(model.lastname).to.equal('Stark');
        expect(model.age).to.equal(45);
        expect(model.weight).to.equal(82.1);
        expect(model.human).to.equal(true);
        expect(model.gender).to.equal('MALE');
        expect(model.nicknames).to.deep.equal(['Ironman', 'Iron Man']);
      });
    });

    it('parses queries parameters', () => {
      return verifyGetRequest(app, basePath + '/ParameterTest/Queries?firstname=Tony&lastname=Stark&age=45&weight=82.1&human=true&gender=MALE&nicknames=Ironman&nicknames=Iron Man', (_err, res) => {
        const model = res.body as ParameterTestModel;
        expect(model.firstname).to.equal('Tony');
        expect(model.lastname).to.equal('Stark');
        expect(model.age).to.equal(45);
        expect(model.weight).to.equal(82.1);
        expect(model.human).to.equal(true);
        expect(model.gender).to.equal('MALE');
        expect(model.nicknames).to.deep.equal(['Ironman', 'Iron Man']);
      });
    });

    it('accepts any parameter using a wildcard', () => {
      const object = {
        foo: 'foo',
        bar: 10,
        baz: true,
      };

      return verifyGetRequest(app, basePath + `/GetTest/WildcardQueries?foo=${object.foo}&bar=${object.bar}&baz=${String(object.baz)}`, (_err, res) => {
        const queryParams = res.body as TestModel;

        expect(queryParams.anyType.foo).to.equal(object.foo);
        expect(queryParams.anyType.bar).to.equal(String(object.bar));
        expect(queryParams.anyType.baz).to.equal(String(object.baz));
      });
    });

    it('should reject incompatible entries for typed wildcard', () => {
      const object = {
        foo: '2',
        bar: 10,
        baz: true,
      };

      return verifyGetRequest(
        app,
        basePath + `/GetTest/TypedRecordQueries?foo=${object.foo}&bar=${object.bar}&baz=${String(object.baz)}`,
        (err, _res) => {
          const body = JSON.parse(err.text);
          expect(body.fields['queryParams.baz'].message).to.equal('invalid float number');
        },
        400,
      );
    });

    it('accepts numbered parameters using a wildcard', () => {
      const object = {
        foo: '3',
        bar: 10,
      };

      return verifyGetRequest(app, basePath + `/GetTest/TypedRecordQueries?foo=${object.foo}&bar=${object.bar}`, (_err, res) => {
        const queryParams = res.body as TestModel;

        expect(queryParams.anyType.foo).to.equal(Number(object.foo));
        expect(queryParams.anyType.bar).to.equal(object.bar);
      });
    });

    it('parses path parameters', () => {
      return verifyGetRequest(app, basePath + '/ParameterTest/Path/Tony/Stark/45/82.1/true/MALE', (_err, res) => {
        const model = res.body as ParameterTestModel;
        expect(model.firstname).to.equal('Tony');
        expect(model.lastname).to.equal('Stark');
        expect(model.age).to.equal(45);
        expect(model.weight).to.equal(82.1);
        expect(model.human).to.equal(true);
        expect(model.gender).to.equal('MALE');
      });
    });

    it('parses header parameters', () => {
      return verifyRequest(
        app,
        (_err, res) => {
          const model = res.body as ParameterTestModel;
          expect(model.firstname).to.equal('Tony');
          expect(model.lastname).to.equal('Stark');
          expect(model.age).to.equal(45);
          expect(model.weight).to.equal(82.1);
          expect(model.human).to.equal(true);
          expect(model.gender).to.equal('MALE');
        },
        request => {
          return request.get(basePath + '/ParameterTest/Header').set({
            age: '45',
            firstname: 'Tony',
            gender: 'MALE',
            human: 'true',
            last_name: 'Stark',
            weight: '82.1',
          });
        },
        200,
      );
    });

    it('parses request parameters', () => {
      return verifyGetRequest(app, basePath + '/ParameterTest/Request?firstname=Tony&lastname=Stark&age=45&weight=82.1&human=true&gender=MALE', (_err, res) => {
        const model = res.body as ParameterTestModel;
        expect(model.firstname).to.equal('Tony');
        expect(model.lastname).to.equal('Stark');
        expect(model.age).to.equal(45);
        expect(model.weight).to.equal(82.1);
        expect(model.human).to.equal(true);
        expect(model.gender).to.equal('MALE');
      });
    });

    it('parse request filed parameters', () => {
      const data: ParameterTestModel = {
        age: 26,
        firstname: 'Nick',
        lastname: 'Yang',
        gender: Gender.MALE,
        human: true,
        weight: 50,
      };
      return verifyPostRequest(app, `${basePath}/ParameterTest/RequestProps`, data, (_err, res) => {
        const model = res.body as ParameterTestModel;
        expect(model.age).to.equal(26);
        expect(model.firstname).to.equal('Nick');
        expect(model.lastname).to.equal('Yang');
        expect(model.gender).to.equal(Gender.MALE);
        expect(model.weight).to.equal(50);
        expect(model.human).to.equal(true);
      });
    });

    it('parses body parameters', () => {
      const data: ParameterTestModel = {
        age: 45,
        firstname: 'Tony',
        gender: Gender.MALE,
        human: true,
        lastname: 'Stark',
        weight: 82.1,
      };
      return verifyPostRequest(app, basePath + '/ParameterTest/Body', data, (_err, res) => {
        const model = res.body as ParameterTestModel;
        expect(model.firstname).to.equal('Tony');
        expect(model.lastname).to.equal('Stark');
        expect(model.age).to.equal(45);
        expect(model.weight).to.equal(82.1);
        expect(model.human).to.equal(true);
        expect(model.gender).to.equal(Gender.MALE);
      });
    });

    it('parses body props parameters', () => {
      const data: ParameterTestModel = {
        age: 45,
        firstname: 'Tony',
        gender: Gender.MALE,
        human: true,
        lastname: 'Stark',
        weight: 82.1,
      };
      return verifyPostRequest(app, basePath + '/ParameterTest/BodyProps', data, (_err, res) => {
        const model = res.body as ParameterTestModel;
        expect(model.firstname).to.equal('Tony');
        expect(model.lastname).to.equal('Stark');
        expect(model.age).to.equal(45);
        expect(model.weight).to.equal(82.1);
        expect(model.human).to.equal(true);
        expect(model.gender).to.equal(Gender.MALE);
      });
    });

    it('can get request with generic type', () => {
      return verifyGetRequest(app, basePath + '/GetTest/GenericModel', (_err, res) => {
        const model = res.body as GenericModel<TestModel>;
        expect(model.result.id).to.equal(1);
      });
    });

    it('can get request with generic array', () => {
      return verifyGetRequest(app, basePath + '/GetTest/GenericModelArray', (_err, res) => {
        const model = res.body as GenericModel<TestModel[]>;
        expect(model.result[0].id).to.equal(1);
      });
    });

    it('can get request with generic primative type', () => {
      return verifyGetRequest(app, basePath + '/GetTest/GenericPrimitive', (_err, res) => {
        const model = res.body as GenericModel<string>;
        expect(model.result).to.equal('a string');
      });
    });

    it('can get request with generic primative array', () => {
      return verifyGetRequest(app, basePath + '/GetTest/GenericPrimitiveArray', (_err, res) => {
        const model = res.body as GenericModel<string[]>;
        expect(model.result[0]).to.equal('string one');
      });
    });

    it('can post request with a generic body', () => {
      const data: GenericRequest<TestModel> = {
        name: 'something',
        value: getFakeModel(),
      };
      return verifyPostRequest(app, basePath + '/PostTest/GenericBody', data, (_err, res) => {
        const model = res.body as TestModel;
        expect(model.id).to.equal(1);
      });
    });

    describe('@Res', () => {
      it('Should return on @Res', () => {
        return verifyGetRequest(
          app,
          basePath + '/GetTest/Res',
          (_err, res) => {
            const model = res.body as TestModel;
            expect(model.id).to.equal(1);
            expect(res.get('custom-header')).to.eq('hello');
          },
          400,
        );
      });

      it('Should return on @Res with alias', () => {
        return verifyGetRequest(
          app,
          basePath + '/GetTest/Res_Alias',
          (_err, res) => {
            const model = res.body as TestModel;
            expect(model.id).to.equal(1);
            expect(res.get('name')).to.equal('some_thing');
          },
          400,
        );
      });

      [400, 500].forEach(statusCode => {
        it('Should support multiple status codes with the same @Res structure', () => {
          return verifyGetRequest(
            app,
            basePath + `/GetTest/MultipleStatusCodeRes?statusCode=${statusCode}`,
            (_err, res) => {
              const model = res.body as TestModel;
              expect(model.id).to.equal(1);
              expect(res.get('custom-header')).to.eq('hello');
            },
            statusCode,
          );
        });

        it('Should support multiple status codes with the same @Res structure with alias', () => {
          return verifyGetRequest(
            app,
            basePath + `/GetTest/MultipleStatusCodeRes_Alias?statusCode=${statusCode}`,
            (_err, res) => {
              const model = res.body as TestModel;
              expect(model.id).to.equal(1);
              expect(res.get('name')).to.eq('combine');
            },
            statusCode,
          );
        });
      });

      it('Should not modify the response after headers sent', () => {
        return verifyGetRequest(
          app,
          basePath + '/GetTest/MultipleRes',
          (_err, res) => {
            const model = res.body as TestModel;
            expect(model.id).to.equal(1);
            expect(res.get('custom-header')).to.eq('hello');
          },
          400,
        );
      });

      it('Should not modify the response after headers sent with alias', () => {
        return verifyGetRequest(
          app,
          basePath + '/GetTest/MultipleRes_Alias',
          (_err, res) => {
            const model = res.body as TestModel;
            expect(model.id).to.equal(1);
            expect(res.get('name')).to.eq('some_thing');
          },
          400,
        );
      });
    });
  });
}

export function registerSubResourceTests(app: App, basePath: string) {
  describe('Sub resource', () => {
    it('parses path parameters from the controller description', () => {
      const mainResourceId = 'main-123';

      return verifyGetRequest(app, basePath + `/SubResourceTest/${mainResourceId}/SubResource`, (_err, res) => {
        expect(res.text).to.equal(mainResourceId);
      });
    });

    it('parses path parameters from the controller description and method description', () => {
      const mainResourceId = 'main-123';
      const subResourceId = 'sub-456';

      return verifyGetRequest(app, basePath + `/SubResourceTest/${mainResourceId}/SubResource/${subResourceId}`, (_err, res) => {
        expect(res.text).to.equal(`${mainResourceId}:${subResourceId}`);
      });
    });
  });
}
