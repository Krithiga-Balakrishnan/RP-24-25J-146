// test/ieeeRoutes.test.js

const chai = require('chai');
const expect = chai.expect;
const request = require('supertest');
const express = require('express');
const sinon = require('sinon');
const axios = require('axios');

// Import the router and your Pad model
const router = require('../routes/ieeeRoute');
const Pad = require('../models/Pad');

// Create an express app and attach middleware and the router for testing
const app = express();
app.use(express.json());
app.use('/api/pads', router);

// Sample Pad document for testing (using an in-memory stub)
const samplePad = {
  _id: 'sample123',
  title: 'Sample Document',
  authors: [
    { name: 'John Doe', affiliation: 'University X', email: 'john.doe@example.com' },
    { name: 'Jane Smith', affiliation: 'Institute Y', email: 'jane.smith@example.com' }
  ],
  abstract: 'This is a sample abstract.',
  keyword: 'IEEE, AI, Academic Writing',
  sections: [],
  image_path: "default_image_path.jpg",
  references: []
};

// Stub the Pad.findById method to simulate database operations
before(() => {
  sinon.stub(Pad, 'findById').callsFake((id) => {
    if (id === samplePad._id) {
      return { exec: () => Promise.resolve(samplePad) };
    } else {
      return { exec: () => Promise.resolve(null) };
    }
  });
});

after(() => {
  Pad.findById.restore();
});

describe('IEEE Routes', function() {

  describe('GET /api/pads/:padId', function() {

    it('should return a pad when a valid padId is provided', function(done) {
      request(app)
        .get('/api/pads/sample123')
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          expect(res.body).to.have.property('title', samplePad.title);
          expect(res.body).to.have.property('abstract', samplePad.abstract);
          done();
        });
    });

    it('should return 404 if pad not found', function(done) {
      request(app)
        .get('/api/pads/nonexistentId')
        .expect(404)
        .end(function(err, res) {
          if (err) return done(err);
          expect(res.body).to.have.property('msg', 'Pad not found');
          done();
        });
    });
  });

  describe('POST /api/pads/convert-text', function() {

    it('should return 400 if content is empty', function(done) {
      request(app)
        .post('/api/pads/convert-text')
        .send({ content: '' })
        .expect(400)
        .end(function(err, res) {
          if (err) return done(err);
          expect(res.body).to.have.property('msg', 'No text provided for conversion.');
          done();
        });
    });

    it('should return converted text for valid content', function(done) {
      // Stub the axios.post call that is made to the external AI API
      const fakeResponse = { data: { converted_text: "Converted academic text." } };
      const axiosStub = sinon.stub(axios, 'post').resolves(fakeResponse);

      request(app)
        .post('/api/pads/convert-text')
        .send({ content: 'Informal academic text.' })
        .expect(200)
        .end(function(err, res) {
          // Restore the stub after test execution
          axiosStub.restore();
          if(err) return done(err);
          expect(res.body).to.have.property('converted_text');
          expect(res.body.converted_text).to.equal("Converted academic text.");
          done();
        });
    });
  });
});
