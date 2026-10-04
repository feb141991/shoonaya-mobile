# Chaupar prototype status

This folder contains a pure TypeScript rules prototype. It is not yet a playable or release-ready Chaupar feature: no app screen imports the engine, and there is no board renderer, cowrie animation/physics, saved match, network play, or AI opponent.

The current scoring table and 84-step shared-relative track are provisional. Chaupar rules vary by regional tradition; this code has not been reviewed against a named ruleset. In particular, it does not model each player's route around the board, verified safe-square locations, or paired-pawn (`jodi`) protection. Do not describe the implementation as an authentic or complete rules engine until those rules are agreed with a knowledgeable reviewer and covered by fixtures.

Before building a player-facing game, record the chosen variant and reviewer, define board topology and turn/capture/finish rules, then test those rules independently from rendering. Performance claims about 3D, 120 fps, or bundle size also need measurements from the actual chosen implementation; this prototype uses no 3D renderer or physics engine.
