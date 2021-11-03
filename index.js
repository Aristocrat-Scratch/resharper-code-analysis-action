const core = require("@actions/core");
const github = require("@actions/github");
const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const extract = require('extract-zip');
const exec = require("@actions/exec");
const parseString = require("xml2js").parseString;
const { resourceLimits } = require("worker_threads");

function getFilenameFromUrl(url) {
  const u = new URL(url);
  const pathname = u.pathname;
  const pathClips = pathname.split("/");
  const filenameWithArgs = pathClips[pathClips.length - 1];
  return filenameWithArgs.replace(/\?.*/, "");
}

const test_mode = false;

function getRegionfromOffset(sourceFile, offsetStart, offsetEnd) {

  
  var region = {

  };
  try {
    var text = fs.readFileSync(sourceFile, 'utf8', true);
    var line = 1;
    var column = 1;
    var offset = 0;
    
    for (let i in text) 
    {
      if (text.charAt(i) == '\n')
      {
        line++;
        column = 0;
      }
      offset++;
      column++;
      if (offset == offsetStart) 
      {
        region.startLine  = line;
        region.startColumn = column;
      }
      if (offset >= offsetEnd) 
      {
        region.endLine  = line;
        region.endColumn = column;
        break;
      }
    }
  } 
  catch (error) 
  {

  }
 
  return region;
}

function getSarifLevel(resharperLevel)
{
  var sarifLevel = "note";
  switch(resharperLevel)
  {
    case "WARNING":
      sarifLevel = "warning";
      break;
      case "SUGGESTION":
      sarifLevel = "note";
      break;
      case "ERROR":
      sarifLevel = "error";
      break;
      sarifLevel = "none";
      break;
  }
  return sarifLevel;
}

async function main() {

  const target = path.join(process.env.GITHUB_WORKSPACE, "/resharper");

  try {
    const url = core.getInput("resharpercliurl");
    const solution = core.getInput("solution");
    const solutionDir = path.parse(solution).dir;
    if (!test_mode) {
      if (url.trim() === "") {
        core.setFailed("Failed to find a URL.");
        return;
      }
      console.log(`URL found: ${url}`);
      try {
        fs.mkdirSync(target, {
          recursive: true,
        });
      } catch (e) {
        core.setFailed(`Failed to create target directory ${target}: ${e}`);
        return;
      }
      const body = await fetch(url)
        .then((x) => x.buffer())
        .catch((err) => {
          core.setFailed(`Fail to download file ${url}: ${err}`);
          return undefined;
        });
      if (body === undefined) return;
      console.log("Download completed.");
      const filename = getFilenameFromUrl(url);
      const fullpath = path.join(target, filename);
      fs.writeFileSync(fullpath, body);
      console.log("File saved.");
      core.setOutput("filename", filename);

      await extract(fullpath, { dir: target })
      console.log('Extraction complete')
    }

    const resharperOutput = path.join(process.env.GITHUB_WORKSPACE, "/results.xml");

    if (!test_mode) {
      try {
        const execOptions = {
          cwd: process.env.GITHUB_WORKSPACE
        };

        await exec.exec(`${target}/inspectcode.exe`, ["-f=Xml", "--toolset=16.0", solution, `-o=${resharperOutput}`], execOptions);
        console.log('Analysis Complete.')

      } catch (err) {
        throw new Error(`inspector failed to analize solution with error: ${err}`);
      }
    }

    try {

      var issueTypes = {};
      var resharperXml = fs.readFileSync(resharperOutput, 'utf8', true);
      parseString(resharperXml, { trim: true, explicitArray: false }, function (err, results) {
      // cache issue types for reference
      results.Report.IssueTypes.IssueType.forEach(function (it) {
        issueTypes[it.$.Id] = {
          Id: it.$.Id,
          Category: it.$.Category,
          CategoryId: it.$.CategoryId,
          Description: it.$.Description,
          Severity: it.$.Severity
        }
      });
      var Results = [];
      results.Report.Issues.Project.Issue.forEach(function (it) {

        let sourceFile = path.join(solutionDir, it.$.File);
        var Result = {
          ruleId: it.$.TypeId,
          level: getSarifLevel(issueTypes[it.$.TypeId].Severity),
          message: {
            text: it.$.Message,
            id: it.$.TypeId
          },
          locations: [
            {
              physicalLocation:
              {
                artifactLocation: {
                  uri: `file:///${path.join(solutionDir,it.$.File).replace(/\\/g, "/")}`,
                  "uriBaseId": "SRCROOT"
                },
                region: getRegionfromOffset(sourceFile, ...it.$.Offset.split("-"))
              }
            }
          ],
        }
        Results.push(Result);
      });

      var sarif = {
        "version": "2.1.0",
        "$schema": "https://schemastore.azurewebsites.net/schemas/json/sarif-2.1.0-rtm.5.json",
        "runs": [{/*
          "originalUriBaseIds": {
            "SRCROOT": {
              "uri": `file:///${solutionDir.replace(/\\/g, "/")}`
            }
          },*/
          results:Results,
          "tool": {
            "driver": {
                "name": "Resharper",
                "fullName": "JetBrains Inspect Code",
                "version": results.Report.$.ToolsVersion,
                "informationUri": "https://www.jetbrains.com/help/resharper/InspectCode.html"
            }
          }
        }]
      };
      console.log("asd");
      var sarifoutput = path.join(process.env.GITHUB_WORKSPACE, "/results.sarif")
      fs.writeFileSync(`${sarifoutput}`, JSON.stringify(sarif, null, 2));
      core.setOutput("sarif", sarifoutput);
    });

  } catch (error) {
    throw new Error(`xml2js failed to parse with error: ${err}`);
  }

  } catch (error) {
    core.setFailed(error.message);
  }


}

main();