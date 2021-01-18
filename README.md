DubDub
======
Mass data wrangling, renaming and tidying utility.



Installation
------------
Check you already have [NodeJS@14](https://nodejs.org/en/) installed.

Install via NPM:

```
npm install --global git+https://github.com/hash-bang/DubDub.git
```


Usage
----
Run the `dubdub` command a list of rules, source directory and destination directory.


```
Usage: dubdub [--from=path] --to=path

Options:
  -V, --version             output the version number
  --from [path]             source base path (default is $PWD)
  --to [path]               destination base path
  --glob [expression]       alternative glob expression (default: "*")
  --rule [s/FROM/TO/]       rule to apply, can be specified multiple times to
                            append rules (default: [])
  -p, --parallal [threads]  maximum number of operations to execute at once
                            (default: 3)
  -n, --dryrun              dont actually do anything, just output the shell
                            commands that would run
  -v, --verbose             increase verbosity, specify multiple times for more
                            chatter
  --debug                   alias for --parallel=1 --dryrun
  --stop-unmatched          error out if any globbed files do not match any
                            rules
  -h, --help                display help for command

Notes:
  * Glob expressions can contain Globstars, match groups, exclusions and anything else supported by Minimatch - https://github.com/isaacs/minimatch
  * Only renames files on the same device - this is due to POSIX limitations, cross-file moving can be supported in future though
  * --rule accepts any seperator character in the Perl style e.g. --rule=s!foo.jpg!bar/foo.jpg! to make things easier to read with Unix paths

Examples:

  # Apply default rename rules and move to /shares/files
  dubdub --to /shares/files

  # Accept files in one directory and transfer to another
  dubdub --from /shares/upload --to /shares/files

  # Rename JPG files into /misc
  dubdub --from /shares/upload --to /shares/files --rule 's!?(<base>.+).jpg!misc/${base}!'

  # Place scenes into seperate directories based on naming
  dubdub --from /shares/upload --to /shares/files --rule 's!^scene(?<sceneNo>\d+)-(?<part>\d+).mp4!scenes/${sceneNo}/${part}.mp4!'
```
