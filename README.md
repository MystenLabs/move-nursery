<p align="center">
<img src="https://raw.githubusercontent.com/MystenLabs/sui/refs/heads/main/docs/site/static/img/logo.svg" alt="Logo" width="100" height="100">
</p>

# Welcome to the Move Nursery
The Move Nursery is a repo intended to hold projects that work against Move in the Sui ecosystem.

Projects are likely to compile against the [sui repo](https://github.com/MystenLabs/sui) and they should link to a specific sui commit hash. Depending on `main` 
is not a correct approach as code may break and there is no way for sui developers to know nursery code is broken. `Cargo.toml` should link to a specific commit hash of the sui repo so that projects continues to work irrespective of evolutions of `main`.

If a project depends on proposed changes in the main repo owners must push 2 different PRs. The first one against the sui repo with the proposed changes that should be upstreamed, the second one will be the PR in the nursery that is the project proposed. In that case, the nursery project will be pushed only after the first PR has been reviewed and accepted.
That work stream is intended to clearly identify and isolate code in the main repo that is being proposed and to streamline the review process and the changes needed for the nursery project to work.

# How to Work with the Move Nursery
There is no `Cargo.toml` in the root directory. This repo is not intended to be a single project with a single workspace.

A project owner must choose a subdirectory and must define its own workspace. A `Cargo.toml` will be present in each directory and
be the "root" for that project.

A project **MUST** include a `README.md` with clear specifications/steps on how to build, run and test the project. The `README.md` should also include what are the dependencies on the main repo. Moreover a description of the project should be included in the `README.md`.

Please make sure the projects are consistent with the quality standard that the sui repo honors. License and copyrights should be well defined in each file in the project. Different copyrights than those used in the sui repo will be evaluated on a case by case and discussed in the PR with the owner. Make sure to clearly highlight when a different copyright than that used in the sui repo is proposed.

Because projects are linked against specific version (commit hash) of the sui repo is vital that owners take responsibility to update those versions over time. Please make sure to update those references over time.

There is no CI at the moment and we will define one at some point soon.

Examples will be coming soon as well...

