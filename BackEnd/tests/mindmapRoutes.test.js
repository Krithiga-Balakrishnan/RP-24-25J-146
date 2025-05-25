// tests/mindmapRoutes.test.js
const request = require("supertest");
const mongoose = require("mongoose");
const app     = require("../server");
const Mindmap = require("../models/Mindmap");

describe("Mindmap Routes", () => {
  const base = "/api/mindmaps";
  const makeId = () => new mongoose.Types.ObjectId();

  it("should reject POST without users", async () => {
    const res = await request(app)
      .post(base)
      .send({
        nodes: [],
        links: [],
        image: "placeholder.png"      // <— schema requires image
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/At least one user/);
  });

  it("should create a new mindmap", async () => {
    const ownerId = makeId();
    const payload = {
      users: [{ userId: ownerId, role: "owner" }],
      nodes: [{ id: 1, label: "Root" }],
      links: [],
      image: "data:image/png;base64,XYZ"
    };

    const res = await request(app)
      .post(base)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.mindmap).toHaveProperty("_id");
    expect(res.body.mindmap.users[0].userId).toBe(ownerId.toString());

    const inDb = await Mindmap.findById(res.body.mindmap._id);
    expect(inDb).not.toBeNull();
    expect(inDb.image).toBe(payload.image);
  });

  it("should fetch all mindmaps", async () => {
    await Mindmap.create([
      { users: [{ userId: makeId() }], nodes: [], links: [], image: "a.png" },
      { users: [{ userId: makeId() }], nodes: [], links: [], image: "b.png" },
    ]);

    const res = await request(app).get(base);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it("should fetch one by ID", async () => {
    const doc = await Mindmap.create({
      users: [{ userId: makeId() }],
      nodes: [],
      links: [],
      image: "one.png"
    });

    const res = await request(app).get(`${base}/${doc._id}`);
    expect(res.status).toBe(200);
    expect(res.body._id).toBe(doc._id.toString());
  });

  it("should 404 fetching non-existent ID", async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).get(`${base}/${fakeId}`);
    expect(res.status).toBe(404);
  });

  it("should fetch by userId", async () => {
    const uA = makeId(), uB = makeId();
    await Mindmap.create([
      { users: [{ userId: uA }], nodes: [], links: [], image: "x.png" },
      { users: [{ userId: uB }], nodes: [], links: [], image: "y.png" },
    ]);

    const res = await request(app).get(`${base}/user/${uA}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].users[0].userId).toBe(uA.toString());
  });

  it("should update nodes & links", async () => {
    const doc = await Mindmap.create({
      users: [{ userId: makeId() }],
      nodes: [{ id: 1 }],
      links: [],
      image: "upd.png"
    });

    const update = { nodes: [{ id: 2 }], links: [{ source: 1, target: 2 }] };
    const res = await request(app)
      .put(`${base}/${doc._id}`)
      .send(update);

    expect(res.status).toBe(200);
    expect(res.body.mindmap.nodes[0].id).toBe(2);
  });

  it("should add a user", async () => {
    const doc = await Mindmap.create({
      users: [{ userId: makeId() }],
      nodes: [],
      links: [],
      image: "add.png"
    });

    const newUser = makeId();
    const res = await request(app)
      .put(`${base}/${doc._id}/addUser`)
      .send({ userId: newUser, role: "editor" });

    expect(res.status).toBe(200);
    const ids = res.body.mindmap.users.map(u => u.userId);
    expect(ids).toContain(newUser.toString());
  });

  it("should reject adding same user twice", async () => {
    const dup = makeId();
    const doc = await Mindmap.create({
      users: [{ userId: dup }],
      nodes: [],
      links: [],
      image: "dup.png"
    });

    await request(app).put(`${base}/${doc._id}/addUser`).send({ userId: dup });
    const res = await request(app).put(`${base}/${doc._id}/addUser`).send({ userId: dup });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already exists/);
  });
});
