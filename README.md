<p align="center">
<img src="https://raw.githubusercontent.com/MystenLabs/sui/refs/heads/main/docs/site/static/img/logo.svg" alt="Logo" width="100" height="100">
</p>

# Welcome to the Move Nursery
The Move Nursery is a repo intended to hold projects that work against Move in the Sui ecosystem.

Projects are likely to compile against the [sui repo](https://github.com/MystenLabs/sui) and they should link to a proper sui branch. Depending on `main` 
is fine as long as the owners of the projects will make sure projects build and run against `main`. Depending on a specific git commit hash is also 
perfectly acceptable and may actually be the best approach.

# How to Work with the Move Nursery
There is no `Cargo.toml` in the root directory. This repo is not intended to be a single project with a single workspace.

A project owner must choose a subdirectory and must define its own workspace. A `Cargo.toml` will be present in each directory and
be the "root" for that project.

A project MUST include a `README.md` with clear specification on how to build, run and test the project.

There is no CI at the moment and we will define one at some point soon.

Examples will be coming soon as well...

