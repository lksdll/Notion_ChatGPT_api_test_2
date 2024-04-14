require('dotenv').config();
const axios = require('axios');

const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });
let characteristicsList = {};
const topic = 'body'; // make this dynamic


//---------- FUNCTIONS FOR GETTING DATA OUT OF NOTION ----------\\

async function getBlocksfromPage() {
  const blockId = process.env.NOTION_PAGE_ID;
  const results = await notion.blocks.children.list({
    block_id: blockId,
    page_size: 50,
  });
  return results;
}

async function getBlocksChildren(blockId) {
  const results = await notion.blocks.children.list({
    block_id: blockId,
    page_size: 50,
  });
  return results;
}

function filterBlockType(block, type) {
  return block.type.toLowerCase().includes(type);
}

function filterMeaningfulTopicBlocks(block, meaningfulTopics) {
  for (let i = 0; i < meaningfulTopics.length; i++) {
    if (block.heading_1.rich_text[0].plain_text.toLowerCase().includes(meaningfulTopics[i])) {
      return true;
    }
  }

}

function filterDescriptionBlocks(block) {
  return block.heading_2.rich_text[0].plain_text.toLowerCase().includes('description');
}


async function getNotionData() {

  // Get all blocks of Notion page
  let blocks = await getBlocksfromPage();
  blocks = blocks.results;

  //filter the blocks, so that we only get the blocks that are headings and not deviders. After that we filter the blocks that are meaningful to us. (e.g. body, mind, soul)
  const filteredBlocks = blocks
    .filter(block => filterBlockType(block, 'heading'))
    .filter(block => filterMeaningfulTopicBlocks(block, ['body']));

  // now we get the children of the block that is meaningful to us.
  let meaningfulChildren = await getBlocksChildren(filteredBlocks[0].id);
  meaningfulChildren = meaningfulChildren.results;

  // filter the children blocks, so that we only get the blocks that are headings and not deviders. After that we filter out the description block
  const descriptionBlock = meaningfulChildren
    .filter(block => filterBlockType(block, 'heading'))
    .filter(block => filterDescriptionBlocks(block));

  // now we get all the children of the description block.
  let characteristicsBlocks = await getBlocksChildren(descriptionBlock[0].id);
  characteristicsBlocks = characteristicsBlocks.results;

  const filterCharacteristicsTable = characteristicsBlocks
    .filter(block => filterBlockType(block, 'table'));

  let tableValues = await getBlocksChildren(filterCharacteristicsTable[0].id);
  tableValues = tableValues.results;

  for (const tableRow of tableValues) {
    characteristicsList[tableRow.table_row.cells[0][0].plain_text] = tableRow.table_row.cells[1][0].plain_text;
  }

  console.log(characteristicsList);
}


//---------- FUNCTIONS FOR WRITING DATA TO SUMMARY USING THE CHAT-GPT API ----------\\
async function writeSummaryWithChatGPT() {
  /*const prompt = `Write a summary about a caracter's ${topic} with the following characteristics ${characteristicsList}. The summary needs to be objective and should not include any personal opinions or assumptions.`;

  try {
    const response = await axios.post('https://api.openai.com/v1/completions', {
      prompt: prompt,
      model: 'gpt-3.5-turbo-instruct', // Model to use (you can change this if needed)
      max_tokens: 300 // Max tokens for the completion
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CHAT_GPT_API_KEY}`
      }
    });

    return response.data.choices[0].text.trim();
  } catch (error) {
    console.error('Error:', error.response.data.error.message);
    return null;
  }*/
}


getNotionData().then(() => {
  writeSummaryWithChatGPT().then((summary) => {
    console.log(summary);

  });
})
  .catch((error) => {
    console.error(error + " in getNotionData() function.");
  })


/*for (const characteristicBlock of filteredCharacteristicsBlocks) {
    let characteristicsBlocksChildren = await getBlocksChildren(characteristicBlock.id);
    characteristicsBlocksChildren = characteristicsBlocksChildren.results;

    const filteredCharacteristicsBlocksChildren = characteristicsBlocksChildren
      .filter(block => filterBlockType(block, 'column_list'));

    let columnListItems = await getBlocksChildren(filteredCharacteristicsBlocksChildren[0].id);
    relevantColumnListItem = columnListItems.results[0];

    let characteristic = await getBlocksChildren(relevantColumnListItem.id);
    characteristic = characteristic.results[1].paragraph.rich_text[0].plain_text; // index of 0 of the results array would be the "Type here" field

    characteristicsList[characteristicBlock.heading_3.rich_text[0].plain_text] = characteristic;
  }*/