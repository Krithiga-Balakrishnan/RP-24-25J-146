// test/ieeeRoutes.test.js

const sinon = require('sinon');
const child_process = require('child_process');
const ejs = require('ejs');
const fs = require('fs');
const axios = require('axios');
const resProto = require('express/lib/response');

// 1) Stub exec before requiring the route, so the local `exec` in ieeeRoutes.js is stubbed.
sinon.stub(child_process, 'exec').callsFake((cmd, cb) => cb(null, 'stdout', 'stderr'));

// 2) Stub fs.existsSync so it always “finds” the PDF
sinon.stub(fs, 'existsSync').returns(true);

// 3) Stub ejs.renderFile to capture its `data` argument and return dummy LaTeX
let capturedContent;
sinon.stub(ejs, 'renderFile').callsFake((tplPath, data, opts, cb) => {
  capturedContent = data;
  cb(null, 'DUMMY LATEX');
});

// 4) Override res.download to return JSON of `capturedContent`
sinon.stub(resProto, 'download').callsFake(function(_path, _name, _opts, cb) {
  return this.status(200).json(capturedContent);
});

// Now require everything else
const chai = require('chai');
const expect = chai.expect;
const request = require('supertest');
const express = require('express');
const router = require('../routes/ieeeRoutes');
const Pad = require('../models/Pad');

const app = express();
app.use(express.json());
app.use('/api/pads', router);

// In-memory samplePad with a valid `sections` array
const samplePad = {
  _id: 'sample123',
  title: 'Sample Document',
  authors: [
    { name: 'John Doe', affiliation: 'University X', email: 'john.doe@example.com' },
    { name: 'Jane Smith', affiliation: 'Institute Y', email: 'jane.smith@example.com' }
  ],
  abstract: 'This is a sample abstract.',
  keyword: 'IEEE, AI, Academic Writing',
  image_path: "default_image_path.jpg",
  references: [],
  sections: [
    {
      title: "Test Section",
      content: { ops: [{ insert: "This is a test section.\n" }] },
      aiEnhancement: false,
      subsections: []
    }
  ]
};

before(() => {
  // Stub the DB lookup to return samplePad or null
  sinon.stub(Pad, 'findById').callsFake(id =>
    id === samplePad._id
      ? Promise.resolve(samplePad)
      : Promise.resolve(null)
  );
});

after(() => {
  // Restore everything
  child_process.exec.restore();
  fs.existsSync.restore();
  ejs.renderFile.restore();
  resProto.download.restore();
  Pad.findById.restore();
});

describe('IEEE Routes', function() {
  describe('GET /api/pads/:padId', function() {
    it('should return a pad when a valid padId is provided', function(done) {
      request(app)
        .get('/api/pads/sample123')
        .expect(200)
        .end((err, res) => {
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
        .end((err, res) => {
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
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('msg', 'No text provided for conversion.');
          done();
        });
    });

    it('should return converted text for valid content', function(done) {
      // Stub only the POST for this test
      const fakeResp = { data: { converted_text: "Converted academic text." } };
      const stub = sinon.stub(axios, 'post').resolves(fakeResp);

      request(app)
        .post('/api/pads/convert-text')
        .send({ content: 'Informal academic text.' })
        .expect(200)
        .end((err, res) => {
          stub.restore();
          if (err) return done(err);
          expect(res.body).to.have.property('converted_text', "Converted academic text.");
          done();
        });
    });
  });
});
