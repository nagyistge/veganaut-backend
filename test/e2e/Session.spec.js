'use strict';

var h = require('../helpers_');

h.describe('Session API methods', function() {

    it('cannot access restricted areas when not logged in', function(done) {
        h.request('GET', h.baseURL + 'person/me')
            .set('Authorization', null)
            .end(function(err, res) {
                expect(res.statusCode).toBe(401);
                expect(typeof res.body.error).toBe('string');
                done();
            })
        ;
    });

    it('cannot login without email', function(done) {
        h.request('POST', h.baseURL + 'session').send({
            password: 'but no email'
        }).end(function(err, res) {
            expect(res.statusCode).toBe(400);
            done();
        });
    });

    it('cannot login without password', function(done) {
        h.request('POST', h.baseURL + 'session').send({
            email: 'but no password'
        }).end(function(err, res) {
            expect(res.statusCode).toBe(400);
            done();
        });
    });

    it('cannot login with nothing', function(done) {
        h.request('POST', h.baseURL + 'session').end(function(err, res) {
            expect(res.statusCode).toBe(400);
            done();
        });
    });

    it('can let aliens login', function(done) {
        h.request('POST', h.baseURL + 'session').send({
            email: 'foo@bar.baz',
            password: 'foobar'
        }).end(function(err, res) {
            expect(res.statusCode).toBe(200);
            expect(res.body.sessionId).toBeTruthy();
            done();
        });
        // TODO then call status and it should get an ok as well
    });

    it('cannot let aliens login with wrong password', function(done) {
        h.request('POST', h.baseURL + 'session').send({
            email: 'yann',
            password: 'hasthewrongpassword'
        }).end(function(err, res) {
            expect(res.statusCode).toBe(403);
            done();
        });
    });

    // TODO test log out
    // TODO test log out when no session
    // TODO test login with wrong password

// FIXME: h.request does not have a delete method? how to do http delete?
//    it('can close an old session', function(done) {
//        h.request.delete(h.baseURL + 'session').end(function(err, res) {
//            //TODO define expected behavior
//            expect(res.statusCode).toBe(200);
//            expect(res.body.status).toEqual('OK');
//            done();
//        });
//    });

});
